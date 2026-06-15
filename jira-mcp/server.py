from mcp.server.fastmcp import FastMCP
import json
import os
from datetime import datetime
from typing import Optional

mcp = FastMCP("Jira MCP")

DATA_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "data.json")

STATUSES = ["To Do", "In Progress", "In Review", "Done"]
PRIORITIES = ["Low", "Medium", "High", "Critical"]


def load_data() -> dict:
    if not os.path.exists(DATA_FILE):
        return {"tasks": {}, "counter": 0}
    with open(DATA_FILE, "r", encoding="utf-8") as f:
        return json.load(f)


def save_data(data: dict) -> None:
    with open(DATA_FILE, "w", encoding="utf-8") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)


@mcp.tool()
def create_task(title: str, description: str, priority: str = "Medium") -> str:
    """Create a new task. Priority must be: Low, Medium, High, or Critical."""
    if priority not in PRIORITIES:
        return f"Invalid priority '{priority}'. Choose from: {', '.join(PRIORITIES)}"

    data = load_data()
    data["counter"] += 1
    task_id = f"PROJ-{data['counter']}"

    data["tasks"][task_id] = {
        "id": task_id,
        "title": title,
        "description": description,
        "status": "To Do",
        "priority": priority,
        "created_at": datetime.now().isoformat(),
        "updated_at": datetime.now().isoformat(),
        "comments": [],
    }

    save_data(data)
    return f"Task created successfully!\nID: {task_id}\nTitle: {title}\nPriority: {priority}\nStatus: To Do"


@mcp.tool()
def list_tasks(status: Optional[str] = None, priority: Optional[str] = None) -> str:
    """List all tasks. Optionally filter by status or priority."""
    data = load_data()
    tasks = list(data["tasks"].values())

    if status:
        tasks = [t for t in tasks if t["status"].lower() == status.lower()]
    if priority:
        tasks = [t for t in tasks if t["priority"].lower() == priority.lower()]

    if not tasks:
        return "No tasks found."

    lines = [f"Found {len(tasks)} task(s):\n"]
    for t in tasks:
        lines.append(f"  [{t['id']}] {t['title']}")
        lines.append(f"    Status: {t['status']} | Priority: {t['priority']}")
        comment_count = len(t["comments"])
        if comment_count:
            lines.append(f"    Comments: {comment_count}")
        lines.append("")

    return "\n".join(lines)


@mcp.tool()
def get_task(task_id: str) -> str:
    """Get the full details of a specific task, including all comments."""
    data = load_data()
    task = data["tasks"].get(task_id.upper())

    if not task:
        return f"Task '{task_id}' not found."

    lines = [
        f"=== {task['id']} ===",
        f"Title:       {task['title']}",
        f"Description: {task['description']}",
        f"Status:      {task['status']}",
        f"Priority:    {task['priority']}",
        f"Created:     {task['created_at'][:10]}",
        f"Updated:     {task['updated_at'][:10]}",
        "",
    ]

    if task["comments"]:
        lines.append(f"Comments ({len(task['comments'])}):")
        for c in task["comments"]:
            lines.append(f"  [{c['created_at'][:10]}] {c['author']}: {c['text']}")
    else:
        lines.append("No comments yet.")

    return "\n".join(lines)


@mcp.tool()
def update_status(task_id: str, new_status: str) -> str:
    """Update the status of a task. Status must be: To Do, In Progress, In Review, or Done."""
    if new_status not in STATUSES:
        return f"Invalid status '{new_status}'. Choose from: {', '.join(STATUSES)}"

    data = load_data()
    task = data["tasks"].get(task_id.upper())

    if not task:
        return f"Task '{task_id}' not found."

    old_status = task["status"]
    task["status"] = new_status
    task["updated_at"] = datetime.now().isoformat()
    save_data(data)

    return f"Task {task_id} status updated: '{old_status}' → '{new_status}'"


@mcp.tool()
def add_comment(task_id: str, author: str, text: str) -> str:
    """Add a comment to a task."""
    data = load_data()
    task = data["tasks"].get(task_id.upper())

    if not task:
        return f"Task '{task_id}' not found."

    task["comments"].append({
        "author": author,
        "text": text,
        "created_at": datetime.now().isoformat(),
    })
    task["updated_at"] = datetime.now().isoformat()
    save_data(data)

    return f"Comment added to {task_id} by {author}."


if __name__ == "__main__":
    mcp.run()
