#!/usr/bin/env ts-node
/**
 * Backfill script for originalBookingId field
 * 
 * This script populates the originalBookingId field for all existing bookings
 * that are part of a reschedule chain. It follows the fromReschedule field
 * backwards to find the root booking in each chain.
 * 
 * Usage:
 *   yarn tsx scripts/backfill-original-booking-id.ts [--dry-run]
 */

import prisma from "@calcom/prisma";

interface BookingChainNode {
    id: number;
    uid: string;
    fromReschedule: string | null;
    originalBookingId: number | null;
}

async function findOriginalBookingId(
    bookingId: number,
    bookingCache: Map<string, BookingChainNode>
): Promise<number | null> {
    const booking = Array.from(bookingCache.values()).find((b) => b.id === bookingId);

    if (!booking) {
        console.warn(`Warning: Booking ${bookingId} not found in cache`);
        return null;
    }

    // If this booking already has an originalBookingId, use it
    if (booking.originalBookingId) {
        return booking.originalBookingId;
    }

    // If this booking has no fromReschedule, it is the original
    if (!booking.fromReschedule) {
        return booking.id;
    }

    // Follow the chain backwards
    const previousBooking = bookingCache.get(booking.fromReschedule);
    if (!previousBooking) {
        // The previous booking doesn't exist or wasn't loaded
        // Try to load it from the database
        const dbBooking = await prisma.booking.findUnique({
            where: { uid: booking.fromReschedule },
            select: {
                id: true,
                uid: true,
                fromReschedule: true,
                originalBookingId: true,
            },
        });

        if (!dbBooking) {
            console.warn(`Warning: Previous booking ${booking.fromReschedule} not found for booking ${booking.uid}`);
            return booking.id; // Consider this the root if we can't find the previous
        }

        bookingCache.set(dbBooking.uid, dbBooking);
        return findOriginalBookingId(dbBooking.id, bookingCache);
    }

    return findOriginalBookingId(previousBooking.id, bookingCache);
}

async function backfillOriginalBookingId(dryRun: boolean = false) {
    console.log(`Starting backfill of originalBookingId${dryRun ? " (DRY RUN)" : ""}...`);

    // Get all bookings that have fromReschedule but no originalBookingId
    const bookingsToUpdate = await prisma.booking.findMany({
        where: {
            fromReschedule: { not: null },
            originalBookingId: null,
        },
        select: {
            id: true,
            uid: true,
            fromReschedule: true,
            originalBookingId: true,
        },
    });

    console.log(`Found ${bookingsToUpdate.length} bookings to update`);

    if (bookingsToUpdate.length === 0) {
        console.log("No bookings need updating. Exiting.");
        return;
    }

    // Build a cache of all bookings that might be in chains
    const bookingCache = new Map<string, BookingChainNode>();

    // First pass: add all bookings to update to the cache
    for (const booking of bookingsToUpdate) {
        bookingCache.set(booking.uid, booking);
    }

    // Process each booking
    let updatedCount = 0;
    let errorCount = 0;

    for (const booking of bookingsToUpdate) {
        try {
            const originalId = await findOriginalBookingId(booking.id, bookingCache);

            if (originalId && originalId !== booking.id) {
                console.log(`Booking ${booking.uid} (id: ${booking.id}) -> original: ${originalId}`);

                if (!dryRun) {
                    await prisma.booking.update({
                        where: { id: booking.id },
                        data: { originalBookingId: originalId },
                    });
                }

                updatedCount++;
            } else if (originalId === booking.id) {
                console.log(`Booking ${booking.uid} is the original (no fromReschedule chain found)`);
            }
        } catch (error) {
            console.error(`Error processing booking ${booking.uid}:`, error);
            errorCount++;
        }
    }

    console.log("\nBackfill complete!");
    console.log(`Updated: ${updatedCount} bookings`);
    console.log(`Errors: ${errorCount}`);

    if (dryRun) {
        console.log("\nThis was a DRY RUN - no data was actually modified.");
        console.log("Run without --dry-run to apply changes.");
    }
}

// Parse command line arguments
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");

// Run the backfill
backfillOriginalBookingId(dryRun)
    .then(() => {
        console.log("Script finished successfully");
        process.exit(0);
    })
    .catch((error) => {
        console.error("Script failed:", error);
        process.exit(1);
    })
    .finally(() => {
        prisma.$disconnect();
    });

