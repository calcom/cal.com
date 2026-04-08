---
title: Keep Controllers Thin - HTTP Concerns Only
impact: HIGH
impactDescription: Enables technology-agnostic business logic
tags: api, controllers, http, separation-of-concerns
---

## Keep Controllers Thin - HTTP Concerns Only

**Impact: HIGH**

Controllers are thin layers that handle only HTTP concerns. They take requests, process them, and map data to DTOs that are passed to core application logic. No application or core logic should be seen in API routes or tRPC handlers.

**Controller responsibilities (and ONLY these):**
- Receive and validate incoming requests
- Extract data from request parameters, body, headers
- Transform request data into DTOs
- Call appropriate application services with those DTOs
- Transform application service responses into response DTOs
- Return HTTP responses with proper status codes

**Controllers should NOT:**
- Contain business logic or domain rules
- Directly access databases or external services
- Perform complex data transformations or calculations
- Make decisions about what the application should do
- Know about implementation details of the domain

**Incorrect (business logic in controller):**

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  // Business logic in controller - BAD
  const user = await prisma.user.findFirst({ where: { id: body.userId } });
  if (!user.canBook) {
    return Response.json({ error: "Cannot book" }, { status: 403 });
  }
  
  const booking = await prisma.booking.create({
    data: {
      title: body.title,
      startTime: new Date(body.startTime),
      // Complex logic here...
    }
  });
  
  return Response.json(booking);
}
```

**Correct (thin controller):**

```typescript
export async function POST(request: Request) {
  const body = await request.json();
  
  // Validate input
  const input = CreateBookingSchema.parse(body);
  
  // Delegate to service
  const result = await bookingService.createBooking(input);
  
  // Transform and return
  return Response.json(BookingResponseSchema.parse(result));
}
```

**The principle:**
We must detach HTTP technology from our application. The way we transfer data between client and server (whether REST, tRPC, etc.) should not influence how our core application works. HTTP is a delivery mechanism, not an architectural driver.

Reference: [Cal.com Engineering Blog](https://cal.com/blog/engineering-in-2026-and-beyond)
