import asyncio
import random
import time
import httpx

BASE_URL = "http://127.0.0.1:8000"

# Shared counters (simple + works fine for this test)
class Metrics:
    def __init__(self):
        self.post_count = 0
        self.get_count = 0
        self.lock = asyncio.Lock()

    async def inc_post(self):
        async with self.lock:
            self.post_count += 1

    async def inc_get(self):
        async with self.lock:
            self.get_count += 1

async def creator(client, total, stop_event: asyncio.Event, metrics: Metrics):
    for i in range(total):
        if stop_event.is_set():
            return

        payload = {
            "title": f"title {i}",
            "content": f"content {i}",
            "category": "stress",
            "published": True,
        }

        await client.post(f"{BASE_URL}/posts", json=payload)
        await metrics.inc_post()

async def hunter(client, hunter_id, stop_event: asyncio.Event, metrics: Metrics):
    while not stop_event.is_set():
        rid = random.randint(1, 100)

        r = await client.get(f"{BASE_URL}/posts/{rid}")
        await metrics.inc_get()

        data = r.json()
        if data is not None:
            stop_event.set()
            return {
                "hunter_id": hunter_id,
                "requested_id": rid,
                "post": data,
            }

    return None

async def main(
    total_creates=500,
    hunter_count=10,
    client_timeout=5
):
    stop_event = asyncio.Event()
    metrics = Metrics()

    start = time.perf_counter()

    async with httpx.AsyncClient(timeout=client_timeout) as client:
        create_task = asyncio.create_task(
            creator(client, total=total_creates, stop_event=stop_event, metrics=metrics)
        )

        hunter_tasks = [
            asyncio.create_task(hunter(client, i, stop_event, metrics))
            for i in range(hunter_count)
        ]

        # Wait until first hunter finishes (hit)
        done, pending = await asyncio.wait(
            hunter_tasks, return_when=asyncio.FIRST_COMPLETED
        )

        # Winner result
        winner = list(done)[0].result()

        # Stop everything
        stop_event.set()

        # Cancel remaining hunters
        for t in pending:
            t.cancel()

        # Cancel creator (optional; event already stops it)
        create_task.cancel()

    end = time.perf_counter()
    elapsed = end - start

    total_posts = metrics.post_count
    total_gets = metrics.get_count
    total_reqs = total_posts + total_gets

    rps = total_reqs / elapsed if elapsed > 0 else float("inf")
    get_rps = total_gets / elapsed if elapsed > 0 else float("inf")
    post_rps = total_posts / elapsed if elapsed > 0 else float("inf")

    print("\n================= RESULTS =================")
    print(f"⏱️  Time to hit:        {elapsed:.4f} sec")
    print(f"📨 POSTs sent:          {total_posts}")
    print(f"🔎 GETs sent:           {total_gets}")
    print(f"📦 Total requests:      {total_reqs}")
    print(f"⚡ Req/sec (total):      {rps:.2f}")
    print(f"⚡ Req/sec (GET):        {get_rps:.2f}")
    print(f"⚡ Req/sec (POST):       {post_rps:.2f}")

    if winner:
        print("\n🎯 HIT DETAILS")
        print(f"Hunter:                #{winner['hunter_id']}")
        print(f"Requested /posts/{{id}}: {winner['requested_id']}")
        print(f"Returned post:          {winner['post']}")
        print("==========================================\n")
    else:
        print("\n❌ No hit found (unexpected for this setup).")

asyncio.run(main(total_creates=500, hunter_count=10))
