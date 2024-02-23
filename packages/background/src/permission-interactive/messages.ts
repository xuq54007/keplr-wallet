import { KeplrError, Message } from "@keplr-wallet/router";
import { ROUTE } from "./constants";

export class EnableAccessMsg extends Message<void> {
  public static type() {
    return "enable-access";
  }

  constructor(public readonly chainIds: string[]) {
    super();
  }

  validateBasic(): void {
    if (!this.chainIds || this.chainIds.length === 0) {
      throw new KeplrError("permission", 100, "chain id not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  override approveExternal(): boolean {
    return true;
  }

  type(): string {
    return EnableAccessMsg.type();
  }
}

export class DisableAccessMsg extends Message<void> {
  public static type() {
    return "disable-access";
  }

  constructor(public readonly chainIds: string[]) {
    super();
  }

  validateBasic(): void {
    if (!this.chainIds) {
      throw new KeplrError("permission", 100, "chain id not set");
    }
  }

  route(): string {
    return ROUTE;
  }

  override approveExternal(): boolean {
    return true;
  }

  type(): string {
    return DisableAccessMsg.type();
  }
}
