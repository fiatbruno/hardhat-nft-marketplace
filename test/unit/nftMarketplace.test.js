const { expect, assert } = require("chai")
const { network, getNamedAccounts, ethers, deployments } = require("hardhat")
const { developmentChains } = require("../../helper-hardhat-config")

!developmentChains.includes(network.name)
    ? describe.skip
    : describe("NFT Marketplace Unit Tests", () => {
          let deployer, player, nftMarketplace, basicNft
          const TOKEN_ID = 0
          const PRICE = ethers.utils.parseEther("0.01")

          beforeEach(async () => {
              deployer = (await getNamedAccounts()).deployer
              //   player = (await getNamedAccounts()).player
              // getNamedAccounts and getSigners are different types
              // getSigner is easier to connect to the contract
              const accounts = await ethers.getSigners()
              player = accounts[1]
              await deployments.fixture(["all"])
              nftMarketplace = await ethers.getContract("NftMarketplace", deployer)
              basicNft = await ethers.getContract("BasicNft")
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })
          it("lists and can be bought", async () => {
              await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
              const playerConnectedNftMarketplace = nftMarketplace.connect(player)
              await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                  value: PRICE,
              })
              const newOwner = await basicNft.ownerOf(TOKEN_ID)
              const deployerProceeds = await nftMarketplace.getProceeds(deployer)
              assert(newOwner.toString() == player.address)
                assert(deployerProceeds.toString() == PRICE.toString())
          })

          //   describe("listItem", () => {
          //       it("lists items correclty", async () => {
          //           expect(nftMarketplace.listItem(NFT_ADDRESS, TOKEN_ID, PRICE)).to.emit(
          //               nftMarketplace,
          //               "ItemListed"
          //           )
          //           expect(
          //               nftMarketplace.listItem(NFT_ADDRESS, TOKEN_ID, 0)
          //           ).to.revertedWithCustomError("NftMarketplace__PriceMustBeAboveZero")
          //       })
          //   })
          //   describe("buyItem", () => {
          //       it("lists items correclty", async () => {
          //           expect(nftMarketplace.listItem(NFT_ADDRESS, TOKEN_ID, PRICE)).to.emit(
          //               nftMarketplace,
          //               "ItemListed"
          //           )
          //           expect(
          //               nftMarketplace.listItem(NFT_ADDRESS, TOKEN_ID, 0)
          //           ).to.revertedWithCustomError("NftMarketplace__PriceMustBeAboveZero")
          //       })
          //   })
      })
