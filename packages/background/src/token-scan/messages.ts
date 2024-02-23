import { Message } from "@keplr-wallet/router";
import { TokenScan } from "./service";
import { ROUTE } from "./constants";

export class GetTokenScansMsg extends Message<TokenScan[]> {
  public static type() {
    return "get-token-scans";
  }

  constructor(public readonly vaultId: string) {
    super();
  }

  validateBasic(): void {
    if (!this.vaultId) {
      throw new Error("Empty vault id");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return GetTokenScansMsg.type();
  }
}

export class RevalidateTokenScansMsg extends Message<{
  vaultId: string;
  tokenScans: TokenScan[];
}> {
  public static type() {
    return "revalidate-token-scans";
  }

  constructor(public readonly vaultId: string) {
    super();
  }

  validateBasic(): void {
    if (!this.vaultId) {
      throw new Error("Empty vault id");
    }
  }

  route(): string {
    return ROUTE;
  }

  type(): string {
    return RevalidateTokenScansMsg.type();
  }
}
