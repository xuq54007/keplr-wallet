import { InteractionStore } from "./interaction";
import {
  GlobalPermissionData,
  INTERACTION_TYPE_GLOBAL_PERMISSION,
  INTERACTION_TYPE_PERMISSION,
  PermissionData,
} from "@keplr-wallet/background";
import { MessageRequester } from "@keplr-wallet/router";
import { computed, makeObservable } from "mobx";

export class PermissionStore {
  constructor(
    protected readonly interactionStore: InteractionStore,
    protected readonly requester: MessageRequester
  ) {
    makeObservable(this);
  }

  get waitingPermissionData() {
    if (this.waitingPermissionDatas.length > 0) {
      return this.waitingPermissionDatas[0];
    }
  }

  get waitingPermissionDatas() {
    return this.interactionStore.getAllData<PermissionData>(
      INTERACTION_TYPE_PERMISSION
    );
  }

  @computed
  get waitingPermissionMergedData():
    | ({
        ids: string[];
      } & PermissionData)
    | undefined {
    const data = this.waitingPermissionDatas;
    if (data.length === 0) {
      return;
    }

    const first = data[0];
    const res: {
      ids: string[];
    } & PermissionData = {
      ids: [first.id],
      chainIds: first.data.chainIds,
      type: first.data.type,
      origins: first.data.origins,
    };
    for (let i = 1; i < data.length; i++) {
      const d = data[i];
      if (d.data.type !== first.data.type) {
        break;
      }
      if (d.data.origins.join(",") !== first.data.origins.join(",")) {
        break;
      }

      res.ids.push(d.id);
      res.chainIds.push(...d.data.chainIds);
    }

    // Remove duplicated chain ids.
    res.chainIds = [...new Set(res.chainIds)];

    return res;
  }

  get waitingGlobalPermissionData() {
    if (this.waitingGlobalPermissionDatas.length > 0) {
      return this.waitingGlobalPermissionDatas[0];
    }
  }

  get waitingGlobalPermissionDatas() {
    return this.interactionStore.getAllData<GlobalPermissionData>(
      INTERACTION_TYPE_GLOBAL_PERMISSION
    );
  }

  async approvePermissionWithProceedNext(
    id: string | string[],
    afterFn: (proceedNext: boolean) => void | Promise<void>
  ) {
    await this.interactionStore.approveWithProceedNextV2(id, {}, afterFn);
  }

  async rejectPermissionWithProceedNext(
    id: string | string[],
    afterFn: (proceedNext: boolean) => void | Promise<void>
  ) {
    await this.interactionStore.rejectWithProceedNextV2(id, afterFn);
  }

  async rejectPermissionAll() {
    await this.interactionStore.rejectAll(INTERACTION_TYPE_PERMISSION);
  }

  async approveGlobalPermissionWithProceedNext(
    id: string,
    afterFn: (proceedNext: boolean) => void | Promise<void>
  ) {
    await this.interactionStore.approveWithProceedNextV2(id, {}, afterFn);
  }

  async rejectGlobalPermissionWithProceedNext(
    id: string,
    afterFn: (proceedNext: boolean) => void | Promise<void>
  ) {
    await this.interactionStore.rejectWithProceedNextV2(id, afterFn);
  }

  async rejectGlobalPermissionAll() {
    await this.interactionStore.rejectAll(INTERACTION_TYPE_GLOBAL_PERMISSION);
  }

  isObsoleteInteraction(id: string | undefined): boolean {
    return this.interactionStore.isObsoleteInteraction(id);
  }
}
