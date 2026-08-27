import { handleSsoLogin } from "@hams-fam/sso-client/web";
import { runWebHandler } from "../http-adapter.js";

export function ssoLoginEndpoint(request, response) {
  return runWebHandler(request, response, handleSsoLogin);
}
