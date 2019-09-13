const { planaria } = require("neonplanaria")
const level = require("level")
const L = require("interlevel")
const contractModule = require("./contract/FungibleToken.out.js")
const spec = require("./contract/FungibleToken.json")

// transaction DB container
let txDB

// state DB container
let stateDB

// contract interface
let contract

console.log("\n\n####################")
console.log("#")
console.log("# Welcome to GearSV")
console.log("#")
console.log("####################\n\n")

// wait for contract to initialize before starting planaria
contractModule.onRuntimeInitialized = () => {
  console.log("\n\n####################")
  console.log("#")
  console.log("# Contract Initialized")
  console.log("#")
  console.log("####################\n\n")

  planaria.start({
    // remote bitbus reference
    src: {
      from: 594280,
      path: `${process.cwd()}/${busPath}`
    },
    onstart: (e) => {
      // 1. instantiate contract
      contract = new contractModule.FungibleToken("1CDAfzAK8t6poNBv4K7uiMFyZKvoKdrS9q")

      // 2. instantiate transaction db
      txDB = level("txDB", { valueEncoding: "json" })
      L.server({ db: txDB, port: 28335 })

      // 3. instantiate state db
      stateDB = level("stateDB", { valueEncoding: "json" })
      L.server({ db: stateDB, port: 28336 })
    },
    onmempool: (e) => {
      // do nothing on mempool
      console.log('# on mempool', e)
    },
    onblock: (e) => {

      // 1. update state based on transactions
      const status = e.tx.map((transaction) => updateState(transaction))
      console.log(status)

      // 2. send transaction in relative order to transaction db
      e.tx.forEach((transaction, i) => {
        const tx = {
          SENDER: transaction.in[0].e.a,
          method: transaction.out[0].s3,
          params: JSON.parse(transaction.out[0].s4),
          index: transaction.i,
          status: status[i]
        }
        txDB.put(transaction.tx.h, tx, (error) => {
          if (error) console.log("# could not write transaction to db")
          if (error) console.log("# could not write state update to db")
          console.log("\n\n####################")
          console.log("#")
          console.log(`# Transaction: ${transaction.tx.h}`)
          console.log("#")
          console.log("####################\n")
          console.log(tx)
        })
      })

      // 3. fetch state from getters
      const owner = contract.getOwner()
      const supply = contract.getSupply()
      const rawBalances = contract.getBalances()
      const balanceKeys = rawBalances.keys()
      const balances = {}
      for (let i = 0; i < balanceKeys.size(); i++) {
        balances[balanceKeys.get(i)] = rawBalances.get(balanceKeys.get(i))
      }

      const state = { owner, supply, balances }

      // 3. save state snapshot by block number
      stateDB.put(e.height, state, (error) => {
        if (error) console.log("# could not write state update to db")
        console.log("\n\n####################")
        console.log("#")
        console.log(`# State Updated: ${e.height}`)
        console.log("#")
        console.log("####################\n")
        console.log(state)
        console.log("\n\n")
      })
    },
  })
}


function updateState(transaction) {
  const methodName = transaction.out[0].s3
  const params = JSON.parse(transaction.out[0].s4)
  const SENDER = transaction.in[0].e.a

  switch (methodName) {
    case "setOwner":
      return contract.setOwner(SENDER, ...params)
    case "mint":
      return contract.mint(SENDER, ...params)
    case "transfer":
      return contract.transfer(SENDER, ...params)
    default:
      console.log("# invalid method reference")
      return "invalid"
  }
}