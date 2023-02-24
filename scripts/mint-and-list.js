//TODO Test this script by running : `hh node` and then `hh run scripts/mint-and-list.js`

const { ethers } = require("hardhat")

async function mintAndList() {
    const nftMarketPlace = await ethers.getContract("NftMarketPlace")
    const basicNft = await ethers.getContract("BasicNft")

    console.log("Minting...")
    const mintTx = await basicNft.mintNft()
    const mintTxReciept = await mintTx.wait(1)
    const tokenId = mintTxReciept.events[0].args.tokenId

    console.log("Approving...")
    const approvalTx = await basicNft.approve(nftMarketPlace.address, tokenId)
    await approvalTx.wait(1)

    console.log("Listing NFT...")
    const tx = nftMarketPlace.listItem(basicNft.address, tokenId)
    await tx.wait(1)
    console.log("Listed! ✨")
}

mintAndList()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error)
        process.exit(1)
    })
