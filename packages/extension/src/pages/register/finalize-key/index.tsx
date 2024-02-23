import React, {
  EffectCallback,
  FunctionComponent,
  useEffect,
  useRef,
  useState,
} from "react";
import { RegisterSceneBox } from "../components/register-scene-box";
import { observer } from "mobx-react-lite";
import { useStore } from "../../../stores";
import { useRegisterHeader } from "../components/header";
import {
  useSceneEvents,
  useSceneTransition,
} from "../../../components/transition";
import { WalletStatus } from "@keplr-wallet/stores";
import AnimCreating from "../../../public/assets/lottie/register/creating.json";
import AnimCreatingLight from "../../../public/assets/lottie/register/creating-light.json";
import lottie from "lottie-web";
import { PlainObject } from "@keplr-wallet/background";
import { MultiAccounts } from "@keystonehq/keystone-sdk";
import { useTheme } from "styled-components";

/**
 * FinalizeKeyScene is used to create the key (account).
 * You must `replaceAll()` with this scene to make a key.
 * @constructor
 */
export const FinalizeKeyScene: FunctionComponent<{
  name: string;
  password: string;
  mnemonic?: {
    value: string;
    // If mnemonic is not recovered, but newly generated,
    // it should be set to true.
    isFresh?: boolean;
    bip44Path: {
      account: number;
      change: number;
      addressIndex: number;
    };
  };
  privateKey?: {
    value: Uint8Array;
    meta: PlainObject;
  };
  ledger?: {
    pubKey: Uint8Array;
    app: string;
    bip44Path: {
      account: number;
      change: number;
      addressIndex: number;
    };
  };
  keystone?: MultiAccounts;
  stepPrevious: number;
  stepTotal: number;
}> = observer(
  ({
    name,
    password,
    mnemonic,
    privateKey,
    ledger,
    keystone,
    stepPrevious,
    stepTotal,
  }) => {
    const {
      chainStore,
      accountStore,
      queriesStore,
      keyRingStore,
      priceStore,
      analyticsStore,
    } = useStore();

    const sceneTransition = useSceneTransition();
    const theme = useTheme();

    const header = useRegisterHeader();
    useSceneEvents({
      onWillVisible: () => {
        header.setHeader({
          mode: "empty",
        });
      },
    });

    // Effects depends on below state and these should be called once if length > 0.
    // Thus, you should set below state only once.
    const [candidateAddresses, setCandidateAddresses] = useState<
      {
        chainId: string;
        bech32Addresses: {
          coinType: number;
          address: string;
        }[];
      }[]
    >([]);
    const [vaultId, setVaultId] = useState("");
    const [isAnimEnded, setIsAnimEnded] = useState(false);

    useEffectOnce(() => {
      (async () => {
        // Chain store should be initialized before creating the key.
        await chainStore.waitUntilInitialized();

        // background에서의 체인 정보의 변경사항 (keplr-chain-registry로부터의) 등을 sync 해야한다.
        // 사실 문제가 되는 부분은 유저가 install한 직후이다.
        // 유저가 install한 직후에 바로 register page를 열도록 background가 짜여져있기 때문에
        // 이 경우 background에서 chains service가 체인 정보를 업데이트하기 전에 register page가 열린다.
        // 그 결과 chain image가 제대로 표시되지 않는다.
        // 또한 background와 체인 정보가 맞지 않을 확률이 높기 때문에 잠재적으로도 문제가 될 수 있다.
        // 이 문제를 해결하기 위해서 밑의 한줄이 존재한다.
        await chainStore.updateChainInfosFromBackground();

        let vaultId: unknown;

        let type = "none";
        if (mnemonic) {
          type = "mnemonic";
          vaultId = await keyRingStore.newMnemonicKey(
            mnemonic.value,
            mnemonic.bip44Path,
            name,
            password
          );
        } else if (privateKey) {
          type = "privateKey";
          if (
            privateKey.meta &&
            privateKey.meta["web3Auth"] &&
            (privateKey.meta["web3Auth"] as any)["type"]
          ) {
            type = (privateKey.meta["web3Auth"] as any)["type"];
          }
          vaultId = await keyRingStore.newPrivateKeyKey(
            privateKey.value,
            privateKey.meta,
            name,
            password
          );
        } else if (ledger) {
          type = "ledger";
          vaultId = await keyRingStore.newLedgerKey(
            ledger.pubKey,
            ledger.app,
            ledger.bip44Path,
            name,
            password
          );
        } else if (keystone) {
          type = "keystone";
          vaultId = await keyRingStore.newKeystoneKey(keystone, name, password);
        } else {
          throw new Error("Invalid props");
        }

        if (typeof vaultId !== "string") {
          throw new Error("Unknown error");
        }

        analyticsStore.logEvent("account_created", {
          type,
          new_num_keyrings: keyRingStore.keyInfos.length,
        });

        await chainStore.waitSyncedEnabledChains();

        let promises: Promise<unknown>[] = [];

        for (const chainInfo of chainStore.chainInfos) {
          // If mnemonic is fresh, there is no way that additional coin type account has value to select.
          if (mnemonic) {
            if (
              keyRingStore.needKeyCoinTypeFinalize(vaultId, chainInfo) &&
              mnemonic?.isFresh
            ) {
              promises.push(
                (async () => {
                  await keyRingStore.finalizeKeyCoinType(
                    vaultId,
                    chainInfo.chainId,
                    chainInfo.bip44.coinType
                  );
                })()
              );
            }
          }
        }

        await Promise.allSettled(promises);

        const candidateAddresses: {
          chainId: string;
          bech32Addresses: {
            coinType: number;
            address: string;
          }[];
        }[] = [];

        promises = [];
        for (const chainInfo of chainStore.chainInfos) {
          if (keyRingStore.needKeyCoinTypeFinalize(vaultId, chainInfo)) {
            promises.push(
              (async () => {
                const res = await keyRingStore.computeNotFinalizedKeyAddresses(
                  vaultId,
                  chainInfo.chainId
                );

                candidateAddresses.push({
                  chainId: chainInfo.chainId,
                  bech32Addresses: res.map((res) => {
                    return {
                      coinType: res.coinType,
                      address: res.bech32Address,
                    };
                  }),
                });
              })()
            );
          } else {
            const account = accountStore.getAccount(chainInfo.chainId);
            promises.push(
              (async () => {
                if (account.walletStatus !== WalletStatus.Loaded) {
                  await account.init();
                }

                if (account.bech32Address) {
                  candidateAddresses.push({
                    chainId: chainInfo.chainId,
                    bech32Addresses: [
                      {
                        coinType: chainInfo.bip44.coinType,
                        address: account.bech32Address,
                      },
                    ],
                  });
                }
              })()
            );
          }
        }

        await Promise.allSettled(promises);

        setVaultId(vaultId);
        setCandidateAddresses(candidateAddresses);
      })();
    });

    useEffect(() => {
      if (candidateAddresses.length > 0) {
        // Should call once.
        (async () => {
          const promises: Promise<unknown>[] = [];

          for (const candidateAddress of candidateAddresses) {
            const queries = queriesStore.get(candidateAddress.chainId);
            for (const bech32Address of candidateAddress.bech32Addresses) {
              // Prepare queries state to avoid UI flicker on next scene.
              promises.push(
                queries.cosmos.queryAccount
                  .getQueryBech32Address(bech32Address.address)
                  .waitFreshResponse()
              );
              promises.push(
                (async () => {
                  const chainInfo = chainStore.getChain(
                    candidateAddress.chainId
                  );
                  const bal = queries.queryBalances
                    .getQueryBech32Address(bech32Address.address)
                    .getBalance(
                      chainInfo.stakeCurrency || chainInfo.currencies[0]
                    );

                  if (bal) {
                    await bal.waitFreshResponse();
                  }
                })()
              );
              promises.push(
                queries.cosmos.queryDelegations
                  .getQueryBech32Address(bech32Address.address)
                  .waitFreshResponse()
              );
            }

            const chainInfo = chainStore.getChain(candidateAddress.chainId);
            const targetCurrency =
              chainInfo.stakeCurrency || chainInfo.currencies[0];
            if (targetCurrency.coinGeckoId) {
              // Push coingecko id to priceStore.
              priceStore.getPrice(targetCurrency.coinGeckoId);
            }
          }

          // Try to make sure that prices are fresh.
          promises.push(priceStore.waitFreshResponse());

          await Promise.allSettled(promises);
        })();
      }
      // Make sure to this effect called once.
      // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [candidateAddresses]);

    // XXX: sceneTransition은 method마다 ref이 변한다.
    //      onceRef이 없으면 무한루프에 빠진다.
    //      처음에 이걸 고려 안해서 이런 문제가 생겨버렸는데
    //      수정할 시간이 없으니 일단 대충 처리한다.
    const onceRef = useRef<boolean>(false);
    useEffect(() => {
      if (
        !onceRef.current &&
        candidateAddresses.length > 0 &&
        vaultId &&
        isAnimEnded
      ) {
        onceRef.current = true;

        sceneTransition.replace("enable-chains", {
          vaultId,
          candidateAddresses,
          isFresh: mnemonic?.isFresh ?? false,
          stepPrevious: stepPrevious,
          stepTotal: stepTotal,
        });
      }
    }, [
      candidateAddresses,
      isAnimEnded,
      mnemonic?.isFresh,
      sceneTransition,
      stepPrevious,
      stepTotal,
      vaultId,
    ]);

    const animContainerRef = useRef<HTMLDivElement | null>(null);
    useEffect(() => {
      if (animContainerRef.current) {
        const anim = lottie.loadAnimation({
          container: animContainerRef.current,
          renderer: "svg",
          loop: false,
          autoplay: true,
          animationData:
            theme.mode === "light" ? AnimCreatingLight : AnimCreating,
        });

        // When anim ends, the scene will be replaced with next scene.
        // Animation time helps prepare queries state to avoid UI flicker on next scene.
        anim.addEventListener("complete", () => {
          setIsAnimEnded(true);
        });

        return () => {
          anim.destroy();
        };
      }
    }, []);

    return (
      <RegisterSceneBox
        style={{
          padding: 0,
          overflow: "hidden",
        }}
      >
        <div
          ref={animContainerRef}
          style={{
            width: "17.5rem",
            height: "17.5rem",
          }}
        />
      </RegisterSceneBox>
    );
  }
);

const useEffectOnce = (effect: EffectCallback) => {
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(effect, []);
};
