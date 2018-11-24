import Web3 from 'web3'
const util = require('util')
const exec = util.promisify(require('child_process').exec)
const ISSUE_CANDY_COMMAND = './issue_candy.sh'
const RECEIVER_ADDRESS = '0x7357c4eb39e8e7c4d66635e2d76b343be759c88b'

const enableERC20Receiver = true

let erc20 = null
const erc20Address = '0x795cf7655ee5a0498b411fcaf69d1ce66b638369'
const latestFetchBlockHeight = 3397268
const erc20Abi = [
  {
    'constant': true,
    'inputs': [],
    'name': 'totalSupply',
    'outputs': [
      {
        'name': '',
        'type': 'uint256'
      }
    ],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'constant': true,
    'inputs': [
      {
        'name': '_owner',
        'type': 'address'
      }
    ],
    'name': 'balanceOf',
    'outputs': [
      {
        'name': 'balance',
        'type': 'uint256'
      }
    ],
    'payable': false,
    'stateMutability': 'view',
    'type': 'function'
  },
  {
    'constant': false,
    'inputs': [
      {
        'name': '_to',
        'type': 'address'
      },
      {
        'name': '_value',
        'type': 'uint256'
      }
    ],
    'name': 'transfer',
    'outputs': [],
    'payable': false,
    'stateMutability': 'nonpayable',
    'type': 'function'
  },
  {
    'anonymous': false,
    'inputs': [
      {
        'indexed': true,
        'name': 'from',
        'type': 'address'
      },
      {
        'indexed': true,
        'name': 'to',
        'type': 'address'
      },
      {
        'indexed': false,
        'name': 'value',
        'type': 'uint256'
      }
    ],
    'name': 'Transfer',
    'type': 'event'
  }
]


// Initial web3
// const web3 = new Web3('wss://mainnet.infura.io/_ws')
// const web3 = new Web3('wss://ropsten.infura.io/_ws')
// const web3 = new Web3('wss://rinkeby.infura.io/_ws')
// const web3 = new Web3('wss://pzcethnode.afourleaf.com:28546')
const web3 = new Web3('wss://kovan.infura.io/ws')

// Issue candy command, use IR transmit to send signal to candy machine.
async function issueCandy() {
  const { stdout, stderr } = await exec(ISSUE_CANDY_COMMAND)
  console.log('stdout:', stdout)
  console.log('stderr:', stderr)
}

async function startCheckingERC20 () {
  let currentBlockHeight = await web3.eth.getBlockNumber()
  latestFetchBlockHeight = currentBlockHeight
  checkReceiveNewERC20()
}

async function checkReceiveNewERC20 () {
  let currentBlockHeight = await web3.eth.getBlockNumber()

  // No need to fetch when no new block
  if (latestFetchBlockHeight === currentBlockHeight) {
    setTimeout(() => {
      checkReceiveNewERC20()
    }, 1000)
  } else {
    erc20.getPastEvents('Transfer', {
      filter: {
        to: '0x7357c4eb39e8e7c4d66635e2d76b343be759c88b'
      },
      fromBlock: latestFetchBlockHeight,
      toBlock: currentBlockHeight
    }).then(events => {
      // Got new Thai baht
      console.log(`${events.length} ${latestFetchBlockHeight} -> ${currentBlockHeight}`) // same results as the optional callback above
      latestFetchBlockHeight = currentBlockHeight
      setTimeout(() => {
        checkReceiveNewERC20()
      }, 1000)
    })
  }
}

// Accept ERC20
if (enableERC20Receiver) {
  erc20 = new web3.eth.Contract(erc20Abi, erc20Address)
  console.log(`Ready, feed me some ERC20 to ${RECEIVER_ADDRESS}`)
  startCheckingERC20()

// Accept eth
} else {
  // Subsribe to pending transaciton
  var subscription = web3.eth.subscribe('pendingTransactions')
  .on("data", transaction => {
    web3.eth.getTransaction(transaction).then(result => {
      // Found a new transaciton
      // Validate transaction info
      if (typeof result === 'undefined' || result == null || typeof result.to === 'undefined' || result.to === null) {
        return
      }

      // For debug uncomment this line
      // console.log('from: ' + result.from + ' to: ' + result.to + ' tx: ' + transaction)

      // Watch on incoming ether to RECEIVER_ADDRESS
      if (result.to.toLocaleLowerCase() === RECEIVER_ADDRESS.toLocaleLowerCase()) {
        console.log('from: ' + result.from + ' to: ' + result.to + ' tx: ' + transaction)
        issueCandy()
      }
    })
  })

  console.log(`Ready, feed me some ETHs to ${RECEIVER_ADDRESS}`)
}
