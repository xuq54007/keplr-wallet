import { IMessageRenderer } from "../types";
import React, { FunctionComponent } from "react";
import { MsgVote } from "@keplr-wallet/proto-types/cosmos/gov/v1beta1/tx";
import { VoteOption } from "@keplr-wallet/proto-types/cosmos/gov/v1beta1/gov";
import { Image } from "../../../../../components/image";
import { FormattedMessage, useIntl } from "react-intl";

export const VoteMessage: IMessageRenderer = {
  process(chainId: string, msg) {
    const d = (() => {
      if ("type" in msg && msg.type === "cosmos-sdk/MsgVote") {
        return {
          proposalId: msg.value.proposal_id,
          voter: msg.value.voter,
          option: msg.value.option,
        };
      }

      if ("unpacked" in msg && msg.typeUrl === "/cosmos.gov.v1beta1.MsgVote") {
        return {
          proposalId: (msg.unpacked as MsgVote).proposalId,
          voter: (msg.unpacked as MsgVote).voter,
          option: (msg.unpacked as MsgVote).option,
        };
      }
    })();

    if (d) {
      return {
        icon: (
          <Image
            alt="sign-vote-image"
            src={require("../../../../../public/assets/img/sign-vote.png")}
            style={{ width: "3rem", height: "3rem" }}
          />
        ),
        title: (
          <FormattedMessage id="page.sign.components.messages.vote.title" />
        ),
        content: (
          <VoteMessagePretty
            chainId={chainId}
            proposalId={d.proposalId}
            voter={d.voter}
            option={d.option}
          />
        ),
      };
    }
  },
};

const VoteMessagePretty: FunctionComponent<{
  chainId: string;
  proposalId: string;
  voter: string;
  option: VoteOption | string;
}> = ({ proposalId, option }) => {
  const intl = useIntl();
  const textualOption = (() => {
    if (typeof option === "string") {
      return option;
    }

    switch (option) {
      case 0:
        return intl.formatMessage({
          id: "page.sign.components.messages.vote.empty",
        });
      case 1:
        return intl.formatMessage({
          id: "page.sign.components.messages.vote.yes",
        });
      case 2:
        return intl.formatMessage({
          id: "page.sign.components.messages.vote.abstain",
        });
      case 3:
        return intl.formatMessage({
          id: "page.sign.components.messages.vote.no",
        });
      case 4:
        return intl.formatMessage({
          id: "page.sign.components.messages.vote.no-with-veto",
        });
      default:
        return intl.formatMessage({
          id: "page.sign.components.messages.vote.unspecified",
        });
    }
  })();

  return (
    <React.Fragment>
      <FormattedMessage
        id="page.sign.components.messages.vote.paragraph"
        values={{
          textualOption,
          proposalId,
          b: (...chunks: any) => <b>{chunks}</b>,
        }}
      />
    </React.Fragment>
  );
};
