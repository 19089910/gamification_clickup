import { BASE_URL, getHeaders } from "./api";

/**
 * Add a dependency to a task.
 * dependency_type can be "waiting_on" (task B must wait for task A)
 */
export async function addDependency(
  taskId: string,
  dependsOnId: string,
  type: "waiting_on" | "blocking" = "waiting_on"
): Promise<any> {
  const payload = {
    depends_on: dependsOnId,
    dependency_type: type,
  };

  const res = await fetch(`${BASE_URL}/task/${taskId}/dependency`, {
    method: "POST",
    headers: getHeaders(),
    body: JSON.stringify(payload),
  });

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ClickUp Dependency Error [${res.status}]: ${error}`);
  }

  return res.json();
}

/**
 * Remove a dependency from a task.
 */
export async function removeDependency(
  taskId: string,
  dependsOnId: string,
  type: "waiting_on" | "blocking" = "waiting_on"
): Promise<any> {
  const res = await fetch(
    `${BASE_URL}/task/${taskId}/dependency?depends_on=${dependsOnId}&dependency_type=${type}`,
    {
      method: "DELETE",
      headers: getHeaders(),
    }
  );

  if (!res.ok) {
    const error = await res.text();
    throw new Error(`ClickUp Dependency Remove Error [${res.status}]: ${error}`);
  }

  return res.json();
}
