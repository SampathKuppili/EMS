from datetime import datetime
from django.core.management.base import BaseCommand
from django.utils import timezone

from attendance.services import auto_classify_absences_for_date


class Command(BaseCommand):
    help = 'Processes daily attendance: marks active employees without check-ins as absent, on leave, holiday, or weekend.'

    def add_arguments(self, parser):
        parser.add_argument(
            '--date',
            type=str,
            help='Target date to process in YYYY-MM-DD format (default: today).',
        )

    def handle(self, *args, **options):
        date_str = options.get('date')
        if date_str:
            try:
                target_date = datetime.strptime(date_str, '%Y-%m-%d').date()
            except ValueError:
                self.stderr.write(self.style.ERROR(f"Invalid date format '{date_str}'. Use YYYY-MM-DD."))
                return
        else:
            target_date = timezone.localdate()

        self.stdout.write(f"Processing attendance classification for {target_date}...")
        count = auto_classify_absences_for_date(target_date)
        self.stdout.write(
            self.style.SUCCESS(
                f"Successfully processed daily attendance for {target_date}: {count} records classified."
            )
        )
