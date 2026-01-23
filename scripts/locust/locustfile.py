"""
Locust load testing file for Books API

Usage:
    # Web UI mode (default)
    locust -f locustfile.py --host=http://localhost:3000

    # Headless mode
    locust -f locustfile.py --host=http://localhost:3000 --headless -u 100 -r 10 -t 5m

    # Against staging
    locust -f locustfile.py --host=https://books-api.staging.cloudnative.lat

Options:
    -u, --users: Number of concurrent users
    -r, --spawn-rate: Users spawned per second
    -t, --run-time: Test duration (e.g., 5m, 1h)
"""

from locust import HttpUser, task, between, tag
import random


class BooksAPIUser(HttpUser):
    """Simulates a typical user interacting with the Books API."""

    # Wait between 1 and 3 seconds between tasks
    wait_time = between(1, 3)

    @tag("health", "smoke")
    @task(1)
    def health_check(self):
        """Check API health status."""
        with self.client.get("/health", name="/health", catch_response=True) as response:
            if response.status_code == 200:
                json_data = response.json()
                if json_data.get("status") == "healthy":
                    response.success()
                else:
                    response.failure(f"Unhealthy status: {json_data.get('status')}")
            else:
                response.failure(f"Status code: {response.status_code}")

    @tag("books", "read")
    @task(10)
    def list_books(self):
        """List all books - most common operation."""
        self.client.get("/books", name="/books")

    @tag("books", "read")
    @task(5)
    def get_root(self):
        """Get API info."""
        self.client.get("/", name="/")

    @tag("books", "read")
    @task(3)
    def get_books_hi(self):
        """Get hi message."""
        self.client.get("/books/hi", name="/books/hi")

    @tag("books", "write")
    @task(2)
    def create_book(self):
        """Create a new book."""
        book_data = {
            "title": f"Test Book {random.randint(1, 10000)}",
            "author": f"Author {random.randint(1, 100)}",
            "isbn": f"978{random.randint(1000000000, 9999999999)}"
        }
        self.client.post("/books/new", json=book_data, name="/books/new")

    @tag("metrics", "observability")
    @task(1)
    def get_metrics(self):
        """Fetch Prometheus metrics."""
        self.client.get("/metrics", name="/metrics")


class TraceTestUser(HttpUser):
    """User focused on testing OpenTelemetry tracing."""

    wait_time = between(2, 5)
    weight = 1  # Lower weight than main user

    @tag("trace", "observability")
    @task(5)
    def trace_default(self):
        """Generate trace with default settings."""
        self.client.get("/trace", name="/trace [default]")

    @tag("trace", "observability")
    @task(3)
    def trace_custom_operation(self):
        """Generate trace with custom operation name."""
        operations = ["checkout", "payment", "inventory-check", "user-auth", "order-process"]
        operation = random.choice(operations)
        self.client.get(f"/trace?operation={operation}", name="/trace [custom-op]")

    @tag("trace", "observability")
    @task(2)
    def trace_multiple_steps(self):
        """Generate trace with multiple steps."""
        steps = random.randint(3, 8)
        self.client.get(f"/trace?steps={steps}", name="/trace [multi-step]")

    @tag("trace", "observability")
    @task(1)
    def trace_full_custom(self):
        """Generate fully customized trace."""
        operations = ["order-flow", "user-journey", "api-chain"]
        operation = random.choice(operations)
        steps = random.randint(4, 10)
        delay = random.choice([50, 100, 150, 200])
        self.client.get(
            f"/trace?operation={operation}&steps={steps}&delay={delay}",
            name="/trace [full-custom]"
        )


class StressTestUser(HttpUser):
    """User for stress testing and triggering alerts."""

    wait_time = between(5, 10)
    weight = 1  # Very low weight

    @tag("stress", "cpu")
    @task(3)
    def stress_low(self):
        """Low intensity CPU stress."""
        self.client.get(
            "/stress?duration=3000&intensity=low",
            name="/stress [low]",
            timeout=10
        )

    @tag("stress", "cpu")
    @task(2)
    def stress_medium(self):
        """Medium intensity CPU stress."""
        self.client.get(
            "/stress?duration=5000&intensity=medium",
            name="/stress [medium]",
            timeout=15
        )

    @tag("stress", "cpu", "alert-trigger")
    @task(1)
    def stress_high(self):
        """High intensity CPU stress - may trigger alerts."""
        self.client.get(
            "/stress?duration=10000&intensity=high",
            name="/stress [high]",
            timeout=30
        )


class SmokeTestUser(HttpUser):
    """Lightweight user for smoke testing - quick validation."""

    wait_time = between(0.5, 1)
    weight = 1

    @tag("smoke")
    @task
    def smoke_test(self):
        """Quick smoke test of critical endpoints."""
        # Health check
        self.client.get("/health", name="[smoke] /health")
        # API info
        self.client.get("/", name="[smoke] /")
        # Books list
        self.client.get("/books", name="[smoke] /books")


# Custom event hooks for additional logging
from locust import events

@events.request.add_listener
def on_request(request_type, name, response_time, response_length, response, context, exception, **kwargs):
    """Log slow requests."""
    if response_time > 5000:  # 5 seconds
        print(f"SLOW REQUEST: {request_type} {name} took {response_time}ms")

@events.test_start.add_listener
def on_test_start(environment, **kwargs):
    """Called when test starts."""
    print(f"Starting load test against {environment.host}")
    print("Available tags: health, smoke, books, read, write, trace, metrics, observability, stress, cpu, alert-trigger")

@events.test_stop.add_listener
def on_test_stop(environment, **kwargs):
    """Called when test stops."""
    print("Load test completed!")
