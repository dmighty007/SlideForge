from django.core.management.base import BaseCommand, CommandError

from ai_jobs.services import _run_import_job


class Command(BaseCommand):
    help = "Run a queued AI import job by id."

    def add_arguments(self, parser):
        parser.add_argument("job_id", help="ImportJob UUID")

    def handle(self, *args, **options):
        job_id = str(options["job_id"]).strip()
        if not job_id:
            raise CommandError("job_id is required")
        _run_import_job(job_id)
