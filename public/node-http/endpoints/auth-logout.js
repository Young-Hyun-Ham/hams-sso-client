import { handleSsoLogout } from "@hams-fam/sso-client/web";
import { runWebHandler } from "../http-adapter.js";

export function authLogoutEndpoint(request, response) {
  return runWebHandler(request, response, handleSsoLogout);
}
