import { handleSsoCallback } from "@hams-fam/sso-client/web";
import { runWebHandler } from "../http-adapter.js";

export function ssoCallbackEndpoint(request, response) {
  return runWebHandler(request, response, handleSsoCallback);
}
