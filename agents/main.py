import sys
from datetime import datetime, timezone


# Tasks are imported and added here one by one as they are built
# e.g. from tasks.uptime import run as uptime
TASKS: list = [
    # uptime,
    # daily_digest,
]


def main() -> None:
    print(f"[agent] start — {datetime.now(timezone.utc).isoformat()}")

    failed = 0
    for task in TASKS:
        name = task.__name__
        print(f"[agent] running: {name}")
        try:
            task()
            print(f"[agent] done: {name}")
        except Exception as e:
            print(f"[agent] failed: {name} — {e}")
            failed += 1

    print(f"[agent] complete — {datetime.now(timezone.utc).isoformat()}")
    sys.exit(1 if failed else 0)


if __name__ == "__main__":
    main()
