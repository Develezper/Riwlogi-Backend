import {
  runSubmission,
  sendSubmissionEvents,
  startSubmission,
  submitSubmission,
} from "./submissions.service.js";

export function startSubmissionController(req, res) {
  const payload = startSubmission({
    userId: req.auth.userId,
    problemId: req.body?.problem_id,
    language: req.body?.language,
  });

  res.status(201).json(payload);
}

export async function runSubmissionController(req, res) {
  const result = await runSubmission({
    userId: req.auth.userId,
    submissionId: req.body?.submission_id,
    stageId: req.body?.stage_id,
    code: req.body?.code,
    events: req.body?.events,
  });

  res.json({ result });
}

export function submitSubmissionController(req, res) {
  const payload = submitSubmission({
    userId: req.auth.userId,
    submissionId: req.params?.id,
  });

  res.json(payload);
}

export function sendEventsController(req, res) {
  const payload = sendSubmissionEvents({
    userId: req.auth.userId,
    submissionId: req.params?.id,
    events: req.body?.events,
  });

  res.json(payload);
}
