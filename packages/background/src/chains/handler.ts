import {
  Env,
  Handler,
  InternalHandler,
  KeplrError,
  Message,
} from "@keplr-wallet/router";
import { ChainsService } from "./service";
import {
  GetChainInfosWithCoreTypesMsg,
  GetChainInfosWithoutEndpointsMsg,
  RemoveSuggestedChainInfoMsg,
  SuggestChainInfoMsg,
  SetChainEndpointsMsg,
  ClearChainEndpointsMsg,
  GetChainOriginalEndpointsMsg,
  ClearAllSuggestedChainInfosMsg,
  ClearAllChainEndpointsMsg,
} from "./messages";
import { ChainInfo } from "@keplr-wallet/types";
import { getBasicAccessPermissionType, PermissionService } from "../permission";
import { PermissionInteractiveService } from "../permission-interactive";

type Writeable<T> = { -readonly [P in keyof T]: T[P] };

export const getHandler: (
  chainsService: ChainsService,
  permissionService: PermissionService,
  permissionInteractiveService: PermissionInteractiveService
) => Handler = (
  chainsService,
  permissionService,
  permissionInteractiveService
) => {
  return (env: Env, msg: Message<unknown>) => {
    switch (msg.constructor) {
      case GetChainInfosWithCoreTypesMsg:
        return handleGetInfosWithCoreTypesMsg(chainsService)(
          env,
          msg as GetChainInfosWithCoreTypesMsg
        );
      case GetChainInfosWithoutEndpointsMsg:
        return handleGetChainInfosWithoutEndpointsMsg(
          chainsService,
          permissionInteractiveService
        )(env, msg as GetChainInfosWithoutEndpointsMsg);
      case SuggestChainInfoMsg:
        return handleSuggestChainInfoMsg(chainsService, permissionService)(
          env,
          msg as SuggestChainInfoMsg
        );
      case RemoveSuggestedChainInfoMsg:
        return handleRemoveSuggestedChainInfoMsg(chainsService)(
          env,
          msg as RemoveSuggestedChainInfoMsg
        );
      case SetChainEndpointsMsg:
        return handleSetChainEndpointsMsg(chainsService)(
          env,
          msg as SetChainEndpointsMsg
        );
      case ClearChainEndpointsMsg:
        return handleClearChainEndpointsMsg(chainsService)(
          env,
          msg as ClearChainEndpointsMsg
        );
      case GetChainOriginalEndpointsMsg:
        return handleGetChainOriginalEndpointsMsg(chainsService)(
          env,
          msg as GetChainOriginalEndpointsMsg
        );
      case ClearAllSuggestedChainInfosMsg:
        return handleClearAllSuggestedChainInfosMsg(chainsService)(
          env,
          msg as ClearAllSuggestedChainInfosMsg
        );
      case ClearAllChainEndpointsMsg:
        return handleClearAllChainEndpointsMsg(chainsService)(
          env,
          msg as ClearAllChainEndpointsMsg
        );
      default:
        throw new KeplrError("chains", 110, "Unknown msg type");
    }
  };
};

const handleGetInfosWithCoreTypesMsg: (
  service: ChainsService
) => InternalHandler<GetChainInfosWithCoreTypesMsg> = (service) => {
  return () => {
    return {
      chainInfos: service.getChainInfosWithCoreTypes(),
    };
  };
};

const handleGetChainInfosWithoutEndpointsMsg: (
  service: ChainsService,
  permissionInteractiveService: PermissionInteractiveService
) => InternalHandler<GetChainInfosWithoutEndpointsMsg> = (
  service,
  permissionInteractiveService
) => {
  return async (env, msg) => {
    await permissionInteractiveService.checkOrGrantGetChainInfosWithoutEndpointsPermission(
      env,
      msg.origin
    );

    const chainInfos = service.getChainInfosWithoutEndpoints();
    return {
      chainInfos,
    };
  };
};

const handleSuggestChainInfoMsg: (
  chainsService: ChainsService,
  permissionService: PermissionService
) => InternalHandler<SuggestChainInfoMsg> = (
  chainsService,
  permissionService
) => {
  return async (env, msg) => {
    if (chainsService.getChainInfo(msg.chainInfo.chainId) != null) {
      // If suggested chain info is already registered, just return.
      return;
    }

    const chainInfo = msg.chainInfo as Writeable<ChainInfo>;
    chainInfo.beta = true;

    await chainsService.suggestChainInfo(env, chainInfo, msg.origin);

    permissionService.addPermission(
      [chainInfo.chainId],
      getBasicAccessPermissionType(),
      [msg.origin]
    );
  };
};

const handleRemoveSuggestedChainInfoMsg: (
  service: ChainsService
) => InternalHandler<RemoveSuggestedChainInfoMsg> = (service) => {
  return (_, msg) => {
    service.removeSuggestedChainInfo(msg.chainId);
    return service.getChainInfosWithCoreTypes();
  };
};

const handleSetChainEndpointsMsg: (
  service: ChainsService
) => InternalHandler<SetChainEndpointsMsg> = (service) => {
  return (_, msg) => {
    service.setEndpoint(msg.chainId, {
      rpc: msg.rpc,
      rest: msg.rest,
    });
    return service.getChainInfosWithCoreTypes();
  };
};

const handleClearChainEndpointsMsg: (
  service: ChainsService
) => InternalHandler<ClearChainEndpointsMsg> = (service) => {
  return (_, msg) => {
    service.clearEndpoint(msg.chainId);
    return service.getChainInfosWithCoreTypes();
  };
};

const handleGetChainOriginalEndpointsMsg: (
  service: ChainsService
) => InternalHandler<GetChainOriginalEndpointsMsg> = (service) => {
  return (_, msg) => {
    return service.getOriginalEndpoint(msg.chainId);
  };
};

const handleClearAllSuggestedChainInfosMsg: (
  service: ChainsService
) => InternalHandler<ClearAllSuggestedChainInfosMsg> = (service) => {
  return () => {
    return service.clearAllSuggestedChainInfos();
  };
};

const handleClearAllChainEndpointsMsg: (
  service: ChainsService
) => InternalHandler<ClearAllChainEndpointsMsg> = (service) => {
  return () => {
    return service.clearAllEndpoints();
  };
};
