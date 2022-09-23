import { Cosmos } from "@cosmostation/cosmosjs";
import message from "@cosmostation/cosmosjs/src/messages/proto";
import { MNEMONIC, CHAIN_ID, ICD_URL, CW20CONTRACT, TRANSFER_AMOUNT} from "./config/config";

const cosmos = new Cosmos(ICD_URL, CHAIN_ID);

cosmos.setBech32MainPrefix("juno");
cosmos.setPath("m/44'/118'/0'/0/0");

const address = cosmos.getAddress(MNEMONIC);
const privKey = cosmos.getECPairPriv(MNEMONIC);
const pubKeyAny = cosmos.getPubKeyAny(privKey);


export const transferTestToken = async (recipientAddress) => {

    //check if recipient address is valid
    const recipientAccount = await cosmos.getAccounts(recipientAddress);
    if(recipientAccount.code != null)
        return false;

    const accountData = await cosmos.getAccounts(address);
    
    const transferBytes = new Buffer(`{"transfer":{"amount":"${TRANSFER_AMOUNT}","recipient":"${recipientAddress}"}}`);

    const msgExecuteContract = new message.cosmwasm.wasm.v1.MsgExecuteContract({
        sender: address,
        contract: CW20CONTRACT,
        msg: transferBytes,
        funds: []
    });

    const msgExecuteContractAny = new message.google.protobuf.Any({
        type_url: "/cosmwasm.wasm.v1.MsgExecuteContract",
        value: message.cosmwasm.wasm.v1.MsgExecuteContract.encode(msgExecuteContract).finish()
    });

    const txBody = new message.cosmos.tx.v1beta1.TxBody({ messages: [msgExecuteContractAny], memo: "Send test fury token" });

    // --------------------------------- (2)authInfo ---------------------------------
    const signerInfo = new message.cosmos.tx.v1beta1.SignerInfo({
        public_key: pubKeyAny,
        mode_info: { single: { mode: message.cosmos.tx.signing.v1beta1.SignMode.SIGN_MODE_DIRECT } },
        sequence: accountData.account.sequence
    });

    const feeValue = new message.cosmos.tx.v1beta1.Fee({
        amount: [{ denom: "ujunox", amount: String(5000) }],
        gas_limit: 200000
    });

    const authInfo = new message.cosmos.tx.v1beta1.AuthInfo({ signer_infos: [signerInfo], fee: feeValue });

    // -------------------------------- sign --------------------------------
    const signedTxBytes = cosmos.sign(txBody, authInfo, accountData.account.account_number, privKey);
    const response = await cosmos.broadcast(signedTxBytes);

    if (response.tx_response.code === 0)
        return response.tx_response.txhash;

    return false;
}
