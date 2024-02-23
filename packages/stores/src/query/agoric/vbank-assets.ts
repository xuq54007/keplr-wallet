import { ChainGetter } from "../../chain";
import { makeObservable } from "mobx";
import { QuerySharedContext } from "../../common";
import { ObservableChainQuery } from "../chain-query";
import { VstorageResult } from "./types";

export class ObservableQueryVbankAssets extends ObservableChainQuery<VstorageResult> {
  constructor(
    sharedContext: QuerySharedContext,
    chainId: string,
    chainGetter: ChainGetter
  ) {
    super(
      sharedContext,
      chainId,
      chainGetter,
      "/agoric/vstorage/data/published.agoricNames.vbankAsset"
    );

    makeObservable(this);
  }

  get data(): { body: any; slots: any } | undefined {
    if (!this.response) return undefined;

    const { value } = this.response.data;
    const parsedValue = JSON.parse(value);

    const latestValueStr =
      "values" in parsedValue
        ? parsedValue.values[parsedValue.values.length - 1]
        : parsedValue;

    return JSON.parse(latestValueStr);
  }
}
