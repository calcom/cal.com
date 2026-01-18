#!/usr/bin/env python3
"""
Cal.com Migration Script

Migrates mentor data from old Cal.com instance to new self-hosted instance.

Usage:
    python3 scripts/calcom_migration.py
"""

import os
import sys
from dataclasses import dataclass
from typing import Optional, List, Dict, Any
import logging

import requests
from dotenv import load_dotenv
import pymysql
from pymysql.cursors import DictCursor

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(message)s'
)
logger = logging.getLogger(__name__)


@dataclass
class MentorData:
    """Represents mentor data from database."""
    mentor_user_id: int
    cal_id: Optional[str]
    email: str
    username: Optional[str]
    event_id: Optional[int]
    event_slug: Optional[str]
    schedule_id: Optional[int]


@dataclass
class CalComUser:
    """Represents user data from Cal.com."""
    id: int
    email: str
    name: Optional[str]
    username: Optional[str]
    time_zone: str


@dataclass
class MigrationResult:
    """Tracks migration results."""
    successful: int = 0
    failed: int = 0
    errors: List[Dict[str, str]] = None

    def __post_init__(self):
        if self.errors is None:
            self.errors = []


class CalComAPI:
    """Handles Cal.com API interactions."""

    def __init__(self, base_url: str, client_id: str, client_secret: str):
        self.base_url = base_url
        self.client_id = client_id
        self.client_secret = client_secret
        self.session = requests.Session()
        self.session.headers.update({
            'Accept': 'application/json',
            'Content-Type': 'application/json',
        })

    def _get_headers(self, access_token: Optional[str] = None) -> Dict[str, str]:
        """Get headers with optional access token."""
        headers = {'x-cal-secret-key': self.client_secret}
        if access_token:
            headers['Authorization'] = f'Bearer {access_token}'
        return headers

    def get_user(self, user_id: str) -> Dict[str, Any]:
        """Fetch user details from Cal.com."""
        url = f'{self.base_url}/oauth-clients/{self.client_id}/users/{user_id}'
        response = self.session.get(url, headers=self._get_headers())
        response.raise_for_status()
        return response.json()['data']

    def delete_user(self, user_id: int) -> bool:
        """Delete a managed user from Cal.com."""
        try:
            url = f'{self.base_url}/oauth-clients/{self.client_id}/users/{user_id}'
            response = self.session.delete(url, headers=self._get_headers())
            response.raise_for_status()
            return True
        except requests.RequestException as e:
            logger.warning(f'  ⚠️  Could not delete user {user_id}: {e}')
            return False

    def list_managed_users(self) -> List[Dict[str, Any]]:
        """List all managed users for this OAuth client."""
        try:
            url = f'{self.base_url}/oauth-clients/{self.client_id}/users'
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()['data']
        except requests.RequestException as e:
            logger.warning(f'  ⚠️  Could not list managed users: {e}')
            return []

    def get_event_type(self, event_id: int) -> Optional[Dict[str, Any]]:
        """Fetch event type details."""
        try:
            url = f'{self.base_url}/event-types/{event_id}'
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()['data']
        except requests.RequestException as e:
            logger.warning(f'  ⚠️  Could not fetch event type: {e}')
            return None

    def get_schedule(self, schedule_id: int) -> Optional[Dict[str, Any]]:
        """Fetch schedule/availability data."""
        try:
            url = f'{self.base_url}/schedules/{schedule_id}'
            response = self.session.get(url, headers=self._get_headers())
            response.raise_for_status()
            return response.json()['data']
        except requests.RequestException as e:
            logger.warning(f'  ⚠️  Could not fetch schedule: {e}')
            return None

    def get_user_by_email(self, email: str) -> Optional[Dict[str, Any]]:
        """Try to find user by email in Cal.com."""
        try:
            # Cal.com API doesn't have direct email lookup, so we'll catch 409 instead
            return None
        except Exception:
            return None

    def create_user(self, email: str, name: str, time_zone: str = 'America/New_York') -> Dict[str, Any]:
        """Create new user in Cal.com, or return existing user data if already exists."""
        url = f'{self.base_url}/oauth-clients/{self.client_id}/users'
        payload = {
            'email': email,
            'name': name,
            'timeZone': time_zone
        }
        try:
            response = self.session.post(url, json=payload, headers=self._get_headers())
            response.raise_for_status()
            return response.json()['data']
        except requests.exceptions.HTTPError as e:
            if e.response.status_code == 409:
                # User already exists, we need to handle this
                raise Exception(f'User {email} already exists in Cal.com. Cannot retrieve existing user credentials via API.')
            raise

    def create_event_type(
        self,
        access_token: str,
        slug: str,
        title: str,
        length: int = 60,
        description: str = '',
        locations: Optional[List[Dict]] = None,
        slot_interval: int = 60
    ) -> Dict[str, Any]:
        """Create event type."""
        url = f'{self.base_url}/event-types'
        payload = {
            'length': length,
            'slug': slug,
            'title': title,
            'description': description,
            'locations': locations or [{'type': 'link'}],
            'slotInterval': slot_interval,
            'hidden': False,  # Make it visible/public
            'requiresConfirmation': False,  # Don't require manual approval
            'disableGuests': True,  # Typically you don't want guests
        }
        response = self.session.post(url, json=payload, headers=self._get_headers(access_token))
        response.raise_for_status()
        return response.json()['data']

    def create_schedule(
        self,
        access_token: str,
        name: str,
        time_zone: str = 'America/New_York',
        is_default: bool = True,
        availability: Optional[List[Dict]] = None
    ) -> Dict[str, Any]:
        """Create schedule."""
        url = f'{self.base_url}/schedules'
        payload = {
            'name': name,
            'timeZone': time_zone,
            'isDefault': is_default,
            'availability': availability or []
        }
        response = self.session.post(url, json=payload, headers=self._get_headers(access_token))
        response.raise_for_status()
        return response.json()['data']


class DatabaseManager:
    """Handles database operations."""

    def __init__(self):
        self.connection = pymysql.connect(
            host=os.getenv('DB_HOST_CLUSTER', 'localhost'),
            user=os.getenv('DB_USERNAME'),
            password=os.getenv('DB_PASSWORD'),
            database=os.getenv('DATABASE'),
            cursorclass=DictCursor
        )

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.connection.close()

    def get_mentors(self, skip_migrated: bool = True) -> List[MentorData]:
        """Fetch all mentors with Cal.com data."""
        query = """
            SELECT 
                mentor_user_id, 
                cal_id, 
                email, 
                username,
                event_id,
                event_slug,
                schedule_id 
            FROM mentor_cal_dot_com
        """
        if skip_migrated:
            query += " WHERE new_cal_id IS NULL OR new_cal_id = ''"
            # query += " WHERE new_event_id IS NULL OR new_event_id = ''"
        
        with self.connection.cursor() as cursor:
            cursor.execute(query)
            results = cursor.fetchall()
            return [MentorData(**row) for row in results]

    def update_mentor(
        self,
        mentor_user_id: int,
        access_token: str,
        refresh_token: str,
        cal_id: int,
        email: str,
        username: str,
        event_id: Optional[int],
        event_slug: Optional[str],
        schedule_id: Optional[int]
    ) -> None:
        """Update mentor with new Cal.com credentials in new columns."""
        query = """
            UPDATE mentor_cal_dot_com 
            SET new_access_token = %s,
                new_refresh_token = %s,
                new_cal_id = %s,
                new_email = %s,
                new_username = %s,
                new_event_id = %s,
                new_event_slug = %s,
                new_schedule_id = %s
            WHERE mentor_user_id = %s
        """
        with self.connection.cursor() as cursor:
            cursor.execute(
                query,
                (access_token, refresh_token, cal_id, email, username,
                 event_id, event_slug, schedule_id, mentor_user_id)
            )
            self.connection.commit()

    def clear_migration_data(self) -> None:
      """Clear new_* columns to allow re-migration."""
      query = """
          UPDATE mentor_cal_dot_com 
          SET new_access_token = NULL,
              new_refresh_token = NULL,
              new_cal_id = NULL,
              new_email = NULL,
              new_username = NULL,
              new_event_id = NULL,
              new_event_slug = NULL,
              new_schedule_id = NULL
      """
      with self.connection.cursor() as cursor:
          cursor.execute(query)
          self.connection.commit()
      logger.info('✅ Cleared migration data from database')


class CalComMigration:
    """Main migration orchestrator."""

    def __init__(
        self,
        old_api: CalComAPI,
        new_api: CalComAPI,
        db_manager: DatabaseManager,
        dry_run: bool = True
    ):
        self.old_api = old_api
        self.new_api = new_api
        self.db_manager = db_manager
        self.dry_run = dry_run
        self.results = MigrationResult()

    def migrate_mentor(self, mentor: MentorData) -> None:
        """Migrate a single mentor."""
        logger.info(f'\n--- Processing {mentor.email} ---')

        try:
            # Step 1: Fetch user details from old Cal.com
            logger.info('  📥 Fetching user details from cal.com...')
            old_user = self.old_api.get_user(mentor.cal_id)
            logger.info(f'  ✅ Got user data: {old_user["email"]}')

            # Step 2: Use standard event type settings - 60 min, on the hour only
            event_type_data = {
                'slug': 'one-meeting',
                'title': '1 Hour Mentor Meeting',
                'length': 60,
                'description': 'Meet with mentor for 1 hour',
                'locations': [{'type': 'link'}],
                'slotInterval': 60  # Only allow bookings on the hour (12-1, not 12:30-1:30)
            }
            logger.info('  ℹ️  Using standard event type: 60min, hourly slots only')

            # Step 3: Use standard schedule settings
            schedule_data = {
                'name': 'Availability',
                'timeZone': 'America/Chicago',
                'isDefault': True,
                'availability': [
                    {
                        'days': [1, 2, 3, 4, 5,6,7],  # Monday=1 ... Friday=5
                        'startTime': '09:00',
                        'endTime': '17:00'
                    }
                ]
            }
            logger.info('  ℹ️  Using standard schedule configuration')
            
            if self.dry_run:
                logger.info('  🔍 DRY RUN - Skipping creation steps')
                self.results.successful += 1
                return

            # Step 4: Create user in new Cal.com
            logger.info('  📤 Creating user in self-hosted Cal.com...')
            new_user_response = self.new_api.create_user(
                email=old_user['email'],
                name=old_user.get('name') or old_user.get('username', 'User'),
                time_zone=old_user.get('timeZone', 'America/New_York')
            )

            new_user = new_user_response['user']
            access_token = new_user_response['accessToken']
            refresh_token = new_user_response['refreshToken']
            logger.info(f'  ✅ Created user: {new_user["email"]} (ID: {new_user["id"]})')

            # Step 5: Create event type
            new_event_id = None
            new_event_slug = None
            if event_type_data:
                logger.info('  📤 Creating event type...')
                new_event = self.new_api.create_event_type(
                    access_token=access_token,
                    slug=event_type_data.get('slug', 'one-meeting'),
                    title=event_type_data.get('title', '1 Hour Mentor Meeting'),
                    length=event_type_data.get('length', 60),
                    description=event_type_data.get('description', 'Meet with mentor for 1 hour'),
                    locations=event_type_data.get('locations'),
                    slot_interval=60  # Only allow bookings on the hour
                )
                new_event_id = new_event['id']
                new_event_slug = new_event['slug']
                logger.info(f'  ✅ Created event type: {new_event_slug} (ID: {new_event_id})')

            # Step 6: Create schedule
            new_schedule_id = None
            if schedule_data:
                logger.info('  📤 Creating schedule...')
                new_schedule = self.new_api.create_schedule(
                    access_token=access_token,
                    name=schedule_data.get('name', 'Availability'),
                    time_zone=schedule_data.get('timeZone', 'America/New_York'),
                    is_default=schedule_data.get('isDefault', True),
                    availability=schedule_data.get('availability', [])
                )
                new_schedule_id = new_schedule['id']
                logger.info(f'  ✅ Created schedule (ID: {new_schedule_id})')

            # Step 7: Update database
            logger.info('  💾 Updating database...')
            self.db_manager.update_mentor(
                mentor_user_id=mentor.mentor_user_id,
                access_token=access_token,
                refresh_token=refresh_token,
                cal_id=new_user['id'],
                email=new_user['email'],
                username=new_user.get('username', ''),
                event_id=new_event_id,
                event_slug=new_event_slug,
                schedule_id=new_schedule_id
            )

            logger.info(f'  ✅ Database updated for {mentor.email}')
            self.results.successful += 1

        except Exception as e:
            logger.error(f'  ❌ Failed for {mentor.email}: {e}')
            self.results.errors.append({
                'mentor': mentor.email,
                'error': str(e)
            })
            self.results.failed += 1

    def run(self) -> MigrationResult:
        """Execute the migration."""
        logger.info('🚀 Starting Cal.com migration...\n')

        mentors = self.db_manager.get_mentors()
        logger.info(f'📊 Found {len(mentors)} mentors to migrate\n')

        if self.dry_run:
            logger.info('⚠️  DRY RUN MODE - No changes will be made\n')

        for mentor in mentors:
            self.migrate_mentor(mentor)

        self._print_summary(len(mentors))
        return self.results

    def _print_summary(self, total: int) -> None:
        """Print migration summary."""
        logger.info('\n\n========================================')
        logger.info('📊 MIGRATION SUMMARY')
        logger.info('========================================')
        logger.info(f'✅ Successful: {self.results.successful}')
        logger.info(f'❌ Failed: {self.results.failed}')
        logger.info(f'📈 Total: {total}')

        if self.results.errors:
            logger.info('\n❌ Errors:')
            for error in self.results.errors:
                logger.info(f'  - {error["mentor"]}: {error["error"]}')

        logger.info('\n✅ Migration complete!\n')


def cleanup_new_calcom_users(new_api: CalComAPI, emails_to_delete: List[str]) -> None:
    """Delete users from new Cal.com instance to allow re-migration."""
    logger.info('🧹 Cleaning up existing users in new Cal.com...\n')
    
    # Get all managed users
    managed_users = new_api.list_managed_users()
    
    if not managed_users:
        logger.info('No managed users found.')
        return
    
    deleted_count = 0
    for user in managed_users:
        user_email = user.get('email', '')
        user_id = user.get('id')
        
        # Check if this user's email matches any of our mentors (with or without the client ID suffix)
        should_delete = False
        for email in emails_to_delete:
            base_email = email.split('@')[0]  # Get part before @
            if base_email in user_email:
                should_delete = True
                break
        
        if should_delete and user_id:
            logger.info(f'  🗑️  Deleting user: {user_email} (ID: {user_id})')
            if new_api.delete_user(user_id):
                deleted_count += 1
                logger.info(f'  ✅ Deleted')
            else:
                logger.info(f'  ❌ Failed to delete')
    
    logger.info(f'\n✅ Deleted {deleted_count} users\n')

def main():
    """Main entry point."""
    # Load environment variables
    load_dotenv()

    # Validate environment variables
    required_vars = [
        'CAL_CLIENT_ID',
        'CAL_CLIENT_SECRETE',
        'NEW_CAL_CLIENT_ID',
        'NEW_CAL_CLIENT_SECRETE',
        'DB_USERNAME',
        'DB_PASSWORD',
        'DATABASE',
        "DB_HOST_CLUSTER"
    ]

    missing_vars = [var for var in required_vars if not os.getenv(var)]
    if missing_vars:
        logger.error(f'❌ Missing required environment variables: {", ".join(missing_vars)}')
        sys.exit(1)

    # Display configuration (without secrets)
    logger.info('Configuration:')
    logger.info(f'  OLD Cal Client ID: {os.getenv("CAL_CLIENT_ID")}')
    logger.info(f'  NEW Cal Client ID: {os.getenv("NEW_CAL_CLIENT_ID")}')
    logger.info(f'  Database: {os.getenv("DB_USERNAME")}')
    logger.info('')

    # Initialize APIs
    old_api = CalComAPI(
        base_url='https://api.cal.com/v2',
        client_id=os.getenv('CAL_CLIENT_ID'),
        client_secret=os.getenv('CAL_CLIENT_SECRETE')
    )

    new_api = CalComAPI(
        base_url='https://api.collegecontactcalendar.com/v2',
        client_id=os.getenv('NEW_CAL_CLIENT_ID'),
        client_secret=os.getenv('NEW_CAL_CLIENT_SECRETE')
    )

    # Run migration
    try:
        with DatabaseManager() as db_manager:
            # Get list of mentor emails for cleanup
            mentors = db_manager.get_mentors(skip_migrated=False)
            mentor_emails = [m.email for m in mentors]
            
            # Cleanup existing users in new Cal.com before migration
            cleanup_new_calcom_users(new_api, mentor_emails)
            
            # After cleanup_new_calcom_users, also clear DB:
            db_manager.clear_migration_data()
            
            migration = CalComMigration(
                old_api=old_api,
                new_api=new_api,
                db_manager=db_manager,
                dry_run=False  # Set to False to actually run migration
            )
            results = migration.run()

            # Exit with error code if there were failures
            sys.exit(0 if results.failed == 0 else 1)

    except Exception as e:
        logger.error(f'💥 Migration failed: {e}')
        sys.exit(1)


if __name__ == '__main__':
    main()

