const HORIZON_URL = 'https://horizon-testnet.stellar.org'

const {
    Asset,
    TransactionBuilder,
    Server,
    Operation
} = require('stellar-sdk');


const server = new Server(HORIZON_URL);
const issuerPK = "GAUFUUMX4XOCEOZ64HNBLQOH6JJEMZRYRERQHJHTI7PYTMVCDKORWLXV"
const testNFT = new Asset("testNFT", issuerPK);


const getOwners = async (params) => {
    let trades;
    if (params) {
        const {num} = params
        trades = await server.trades().forAssetPair(testNFT, Asset.native()).order("desc").limit(num).call() 
    }
    else {
        trades = await server.trades().forAssetPair(testNFT, Asset.native()).order("desc").call() 
    }
    const owners = trades.records.map(trade => trade.counter_account)

    return owners
}


const getPendingCommittees = async () => {
    const owners = await getOwners()
    const issuerAccount = await server.loadAccount(issuerPK);

    const data = Object.keys(issuerAccount.data_attr)
    data.sort((a, b) => owners.indexOf(b) - owners.indexOf(a));

    return data
}



const commit = async (params) => {
    const issuerAccount = await server.loadAccount(issuerPK);

    const {
        committeePK
    } = params;

    
    let tx = new TransactionBuilder(issuerAccount, {
        fee: 100,
        networkPassphrase: "Test SDF Network ; September 2015"
    })
    .addOperation(Operation.changeTrust({
        asset: testNFT,
        limit: "1",
        source: committeePK
    }))
    .addOperation(Operation.setTrustLineFlags({
        trustor: committeePK,
        asset: testNFT,
        flags: {
            authorized: true
        }
    }))
    .addOperation(Operation.manageSellOffer({
            selling: testNFT,
            buying: Asset.native(),
            amount: "1",
            price: "200"
        }))
    .addOperation(Operation.manageBuyOffer({
        selling: Asset.native(),
        buying: testNFT,
        buyAmount: "1",
        price: "200",
        source: committeePK
    }))
    .addOperation(Operation.setTrustLineFlags({
        trustor: committeePK,
        asset: testNFT,
        flags: {
            authorized: false
        }
    }))
    .addOperation(Operation.manageData({
        name: committeePK,
        value: "pending",
    }))

    tx = tx.setTimeout(500)
    tx = await tx.build()
    return tx.toEnvelope().toXDR('base64');
}


const process = async () => {
    const issuerAccount = await server.loadAccount(issuerPK);

    
    const pedingCommitments = await getPendingCommittees()
    let owners = await getOwners({num: pedingCommitments.length+2})
    owners = owners.slice(-2).reverse()
    let tx = new TransactionBuilder(issuerAccount, {
        fee: 100,
        networkPassphrase: "Test SDF Network ; September 2015"
    });
    
    const amount_to_pay = "100"

    pedingCommitments.forEach(committePK => {
        owners.slice(-2).forEach(owner => {
            tx.addOperation(Operation.payment({
                destination: owner,
                asset: Asset.native(),
                amount: amount_to_pay
            }))
        })
        owners.push(committePK)
        tx.addOperation(Operation.manageData({
            name: committePK,
            value: null,
        }))
    })



    tx = tx.setTimeout(500)
    tx = await tx.build()
    tx = tx.toEnvelope().toXDR('base64');
    return tx
}


const OPS = {
    "commit": commit,
    "process": process
}



module.exports = async(body) => {
    const {
        op,
        params
    } = body;
    const opFunc = OPS[op];
    if (!opFunc) {
        throw new Error(`Invalid operation ${op}`);
    }
    return opFunc(params);
}

/*
module.exports({
    op: "commit",
    params: {
        committeePK: "GCJEBAU535UMU5KB72JDAWMFERJQ57KEQTS7ZYDMRA5WAEH3YEJQ6PRJ"
    }
}).then(console.log)
*/

/*
module.exports({
    op: "process",
}).then(console.log)
*/