import React, { FunctionComponent, useEffect, useState } from "react";
import { observer } from "mobx-react-lite";
import { HeaderLayout } from "../../layouts/header";
import { CommunityInfoView, RawInfoView, OriginInfoView } from "./components";
import { useStore } from "../../stores";
import { useInteractionInfo } from "../../hooks";
import { InteractionWaitingData } from "@keplr-wallet/background";
import { ChainInfo } from "@keplr-wallet/types";
import { FormattedMessage, useIntl } from "react-intl";
import { ArrowLeftIcon } from "../../components/icon";
import { Box } from "../../components/box";

export const SuggestChainPage: FunctionComponent = observer(() => {
  const { chainSuggestStore } = useStore();

  useInteractionInfo(async () => {
    await chainSuggestStore.rejectAll();
  });

  const waitingData = chainSuggestStore.waitingSuggestedChainInfo;

  if (!waitingData) {
    return null;
  }
  // waiting data가 변하면 `SuggestChainPageImpl`가 unmount되고 다시 mount되는데,
  // 이때, `SuggestChainPageImpl`의 key가 바뀌면서, `SuggestChainPageImpl`의 state가 초기화된다.
  return (
    <SuggestChainPageImpl key={waitingData.id} waitingData={waitingData} />
  );
});

const SuggestChainPageImpl: FunctionComponent<{
  waitingData: InteractionWaitingData<{
    chainInfo: ChainInfo;
    origin: string;
  }>;
}> = observer(({ waitingData }) => {
  const { chainSuggestStore } = useStore();
  const [isLoadingPlaceholder, setIsLoadingPlaceholder] = useState(true);
  const [updateFromRepoDisabled, setUpdateFromRepoDisabled] = useState(false);

  const intl = useIntl();
  const interactionInfo = useInteractionInfo();

  const queryCommunityChainInfo = chainSuggestStore.getCommunityChainInfo(
    waitingData.data.chainInfo.chainId
  );
  const communityChainInfo = queryCommunityChainInfo.chainInfo;

  useEffect(() => {
    if (!queryCommunityChainInfo.isLoading) {
      setIsLoadingPlaceholder(false);
    }
  }, [queryCommunityChainInfo.isLoading]);

  useEffect(() => {
    setTimeout(() => {
      setIsLoadingPlaceholder(false);
    }, 1000);
  }, []);

  return (
    <HeaderLayout
      fixedHeight
      isNotReady={isLoadingPlaceholder}
      title={(() => {
        if (isLoadingPlaceholder) {
          return undefined;
        }

        if (communityChainInfo != null && !updateFromRepoDisabled) {
          return undefined;
        }

        return (
          <FormattedMessage
            id="page.suggest-chain.title"
            values={{ chainName: waitingData.data.chainInfo.chainName }}
          />
        );
      })()}
      left={
        communityChainInfo != null && updateFromRepoDisabled ? (
          <Box
            paddingLeft="1rem"
            cursor="pointer"
            onClick={() => setUpdateFromRepoDisabled(false)}
          >
            <ArrowLeftIcon />
          </Box>
        ) : undefined
      }
      bottomButton={{
        text: intl.formatMessage({ id: "button.approve" }),
        size: "large",
        color: "primary",
        onClick: async () => {
          const chainInfo =
            communityChainInfo && !updateFromRepoDisabled
              ? communityChainInfo
              : waitingData.data.chainInfo;

          await chainSuggestStore.approveWithProceedNext(
            waitingData.id,
            {
              ...chainInfo,
              updateFromRepoDisabled,
            },
            (proceedNext) => {
              if (!proceedNext) {
                if (
                  interactionInfo.interaction &&
                  !interactionInfo.interactionInternal
                ) {
                  window.close();
                }
              }
            }
          );
        },
      }}
    >
      {(() => {
        if (isLoadingPlaceholder) {
          return (
            <CommunityInfoView
              isNotReady={isLoadingPlaceholder}
              origin={waitingData.data.origin}
              chainInfo={waitingData.data.chainInfo}
              communityChainInfoUrl="https://noop.noop"
            />
          );
        }

        if (communityChainInfo) {
          if (updateFromRepoDisabled) {
            return <OriginInfoView waitingData={waitingData} />;
          } else {
            return (
              <CommunityInfoView
                isNotReady={false}
                origin={waitingData.data.origin}
                chainInfo={communityChainInfo}
                communityChainInfoUrl={chainSuggestStore.getCommunityChainInfoUrl(
                  communityChainInfo.chainId
                )}
                setUpdateFromRepoDisabled={() =>
                  setUpdateFromRepoDisabled(true)
                }
              />
            );
          }
        }

        return (
          <RawInfoView
            waitingData={waitingData}
            communityChainInfoRepoUrl={
              chainSuggestStore.communityChainInfoRepoUrl
            }
          />
        );
      })()}
    </HeaderLayout>
  );
});
