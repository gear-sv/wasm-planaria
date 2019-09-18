
//TODO: Use axios / node-jq for HTTP requests and filtering. Eliminate 'exec' calls.

const { exec } = require("child_process")
const fs = require('fs')
const jq = require('node-jq')

const initializeMachine = async (transactionID) => {
  const blockHash = await fetchBlockHash(transactionID)
  const blockHeight = await fetchBlockHeight(blockHash)

  // const constructor = fetchConstructor(transactionID)

  await fetchBlueprint(transactionID)

  // fetchConstructor(transaction_id)

  await createConfig({
    transactionID,
    blockHash,
    blockHeight
  })
}

const verifyEnv = () => {
  if (process.env.TRANSACTION_ID !== 'undefined') {
    let transaction_id = process.env.TRANSACTION_ID
    //console.log('contract specified @ '+transaction_id);
    return transaction_id;
  }
  return console.error('please speicify contract transaction ID by setting TRANSACTION_ID env variable');
}

const fetchBlueprint = (transaction_id) => {
  return new Promise((resolve, reject) => {
    exec(`curl https://bico.media/${transaction_id} > gear-${transaction_id}.tar.gz && tar -xvzf gear-${transaction_id}.tar.gz`,
      (error, stdout, stderr) => {
      if (error) console.log("#### problem fetching machine configuration from on chain", error)
      console.log(stderr)
      resolve(true)
    })
  })
}

const fetchBlockHash = (transaction_id) => {
  return new Promise((resolve, reject) => {
    exec(`curl https://api.whatsonchain.com/v1/bsv/main/tx/hash/${transaction_id} | jq '.blockhash'`,
        (error, stdout, stderr) => {
        if (error) console.log("#### problem fetching blockhash from on chain", error)
        resolve(stdout.replace(`"`, "").replace(`"`, "").slice(0,-1))
      })
  })
}


// This may be redundant and waste of time to get Blockheight every time, we may just want to start from a standard blockheight.
const fetchBlockHeight = (blockhash) => {
  return new Promise((resolve, reject) => {
    exec(`curl https://api.whatsonchain.com/v1/bsv/main/block/hash/${blockhash} | jq '.height'`,
        (error, stdout, stderr) => {
        if (error) console.log("### problem fetching blockhash from on chain", error)
        resolve(stdout.slice(0,-1))
      })
  })
}


const fetchConstructor = (transaction_id) => {
  return new Promise((resolve, reject) => {
    exec(`curl https://api.whatsonchain.com/v1/bsv/main/tx/hash/${transaction_id} | jq '.vout[1].scriptPubKey.addresses[0]'`, (error, stdout, stderr) => {
        if (error) console.log("### problem fetching machine configuration from on chain", error)
        console.log(stdout);
        resolve(stdout.length)
      })
  })
}


const createConfig = (config) => {
  return new Promise((resolve, reject) => {
    fs.writeFile("config.json", JSON.stringify(config), (error) => {
      if (error) console.log("### error creating config file", error)
      console.table(config)
      console.log("\n")
      resolve(true)
    })
  })
}

//console.log('running integration tests: ')

// console.log(fetchBlueprint(verifyEnv()))
//
// const transaction_id = verifyEnv()
// console.log('transaction id: '+transaction_id )
//
// let blockheight = fetchBlockHeight('000000000000000008918bde84f934d87e7df0fa56c2d9b2dd633b4e7cd568bc')
// console.log('blockheight: '+blockheight)
//
// let machineConfig = fetchConstructor('73cc7dd4937af750aa824f7b0f297e9fe7cca744379d08be74e738f7aa5d9afb')
// console.log('machineConfig: '+machineConfig)




module.exports = {
  initializeMachine,
  fetchBlueprint,
  fetchConstructor,
  verifyEnv
}
