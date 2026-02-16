import { app } from "./app.js";
import { env } from "./config/env.js";

app.listen(env.PORT, env.HOST, () => {
  console.log(`Riwlog backend running on http://${env.HOST}:${env.PORT}${env.API_PREFIX}`);
});
