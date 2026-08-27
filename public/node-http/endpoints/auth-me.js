import { handleAuthMe } from "@hams-fam/sso-client/web";
import { runWebHandler } from "../http-adapter.js";

export function authMeEndpoint(request, response) {
  return runWebHandler(request, response, handleAuthMe);
}
