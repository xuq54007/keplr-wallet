import { Router } from "@keplr-wallet/router";
import {
  GetChainInfosWithCoreTypesMsg,
  SuggestChainInfoMsg,
  RemoveSuggestedChainInfoMsg,
  GetChainInfosWithoutEndpointsMsg,
  SetChainEndpointsMsg,
  ClearChainEndpointsMsg,
  GetChainOriginalEndpointsMsg,
  ClearAllSuggestedChainInfosMsg,
  ClearAllChainEndpointsMsg,
} from "./messages";
import { ROUTE } from "./constants";
import { getHandler } from "./handler";
import { ChainsService } from "./service";
import { PermissionService } from "../permission";
import { PermissionInteractiveService } from "../permission-interactive";

export function init(
  router: Router,
  chainService: ChainsService,
  permissionService: PermissionService,
  permissionInteractiveService: PermissionInteractiveService
): void {
  router.registerMessage(GetChainInfosWithCoreTypesMsg);
  router.registerMessage(GetChainInfosWithoutEndpointsMsg);
  router.registerMessage(SuggestChainInfoMsg);
  router.registerMessage(RemoveSuggestedChainInfoMsg);
  router.registerMessage(SetChainEndpointsMsg);
  router.registerMessage(ClearChainEndpointsMsg);
  router.registerMessage(GetChainOriginalEndpointsMsg);
  router.registerMessage(ClearAllSuggestedChainInfosMsg);
  router.registerMessage(ClearAllChainEndpointsMsg);

  router.addHandler(
    ROUTE,
    getHandler(chainService, permissionService, permissionInteractiveService)
  );
}
