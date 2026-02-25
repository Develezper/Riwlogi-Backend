const submissionLocks = new Map();

export function withSubmissionLock(submissionId, task) {
  const key = String(submissionId || "");
  const previous = submissionLocks.get(key) || Promise.resolve();

  const next = previous.catch(() => {}).then(task);
  const tracked = next.finally(() => {
    if (submissionLocks.get(key) === tracked) {
      submissionLocks.delete(key);
    }
  });

  submissionLocks.set(key, tracked);
  return next;
}
