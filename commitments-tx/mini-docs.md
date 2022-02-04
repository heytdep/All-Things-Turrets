# Commitments Contract
This contract works in a strange way, but it is a good example to show how a commitment model on turrets would work: it's not too simple, and not too complex.

### **The purpose of this contract**

Through this contract, users can buy an asset (`"testNFT"`) for 200 XLM, and the money(200/2 XLM) will go the the last 2 owners of that asset. For example, if the list of users that have bought the asset looks like this: `[user1, user2, user3, user4, user5]`, once the new user buys the asset `user4` and `user5` will receive both 100XLM; and so on.

### **Why commitments for this contract**

Since the contract will query the HORIZON API to find the last 2 owners of the asset each time it's ran, it's important to make sure that the 2 users receiving the 100 XLM are **really** the last 2 owners of the asset: going back to the previous example (with `[user1, user2, user3, user4, user5]` as owners of an asset) if two users (`userA`, `userB`) call the contract in about the same timeframe (let's say `userA` calls the contract 0.2 seconds before `userB`) the two transactions returned by the turrets will both pay 100XLM to `user4` and `user5`, while a correct implementation would make sure to pay `user4` and `user5` in one of the two transactions, and pay `user5` and `userA` in the other. 

This is achieved using a commitments model as the one described below.

## How it Works

The contract is divided in two parts:
1. The **commitment** part
2. the **process** part

### **Commitment**
This part accepts as input from the user, only the user's public key. It will then make the user buy the asset for 200 XLM, and add a data attribute to the issuer account that has as `name` the public key of the buyer. This data attribute will be our `commitment`. It could also be convenient to use buy and sell offers since they are by default ordered by time, but they don't allow you to store long strings(such as a public key).

### **Process**
This part will get the owners of the asset, and the pending commitments. Since the user that have committed are owners themselves (they have already bought the asset), after querying the owners from HORIZON we have to only get the latest two of them which are not between the users that have committed.

Then, for each commitment, it will add to the transaction:
- a payment operation of 100XLM to the two owners
- remove the data attribute for that commitment

Also, it will add the user that committed to the list of owners, so in case there were more than one commitment, the second commitment would also include "the user of the first commitment" as owner to pay.


## Conclusive thoughts
There are probably more optimized way to do this, but my biggest concern is that there is not a clear and well-defined way to implement a commitment model to a contract: depending on the situation, the infromation that the `process` part needs could be different, and there might be different ways to query that data.
Because of this, many programmers who might not truly understand the many advantages that off-chain contracts have, might see the fact of needing to implement by scratch a commitment model without any clear documentation too much of a pain compared to on-chain contracts.

Also, since there is no clear way to implement such a model, I have some security concerns since it would be easier to miss something between the two transactions that could cause an exploitation of the contract.
