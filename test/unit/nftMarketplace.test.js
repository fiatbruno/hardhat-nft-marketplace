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
              basicNft = await ethers.getContract("BasicNft", deployer)
              await basicNft.mintNft()
              await basicNft.approve(nftMarketplace.address, TOKEN_ID)
          })

          describe("listItem", () => {
              it("emits an event after listing an item", async () => {
                  await expect(nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)).to.emit(
                      nftMarketplace,
                      "ItemListed"
                  )
              })
              it("reverts if price is less than zero", async () => {
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, 0)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__PriceMustBeAboveZero"
                  )
              })
              it("exclusively items that haven't been listed", async () => {
                  nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__AlreadyListed")
              })
              it("exclusively allows owners to list", async () => {
                  nftMarketplace = await ethers.getContract("NftMarketplace", player)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
              it("needs approvals to list item", async () => {
                  await basicNft.approve(ethers.constants.AddressZero, TOKEN_ID)
                  await expect(
                      nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NotApprovedForMarketplace"
                  )
              })
              it("sets listing with price and seller", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const listing = await nftMarketplace.getListings(basicNft.address, TOKEN_ID)
                  assert.equal(listing.price.toString(), PRICE.toString())
                  assert.equal(listing.seller.toString(), deployer)
              })
          })
          describe("buyItem", () => {
              it("reverts if the item isnt listed", async function () {
                  await expect(
                      nftMarketplace.buyItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
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
              it("reverts when amount is less that price", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await expect(
                      playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                          value: 0,
                      })
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__PriceNotMet")
              })
          })

          describe("cancelItem", () => {
              it("reverts if there is no listing", async function () {
                  await expect(
                      nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("cancels items", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)).to.emit(
                      nftMarketplace,
                      "ItemCancelled"
                  )
                  const listing = await nftMarketplace.getListings(basicNft.address, TOKEN_ID)
                  assert(listing.price.toString() == "0")
              })
              it("reverts if anyone but the owner tries to call", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplace = await ethers.getContract("NftMarketplace", player)
                  await expect(
                      nftMarketplace.cancelItem(basicNft.address, TOKEN_ID)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
          })

          describe("updateListing", () => {
              it("updates listings", async () => {
                  const UPDATE_PRICE = ethers.utils.parseEther("0.02")
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, UPDATE_PRICE)
                  ).to.emit(nftMarketplace, "ItemListed")
                  const listing = await nftMarketplace.getListings(basicNft.address, TOKEN_ID)
                  assert.equal(listing.price.toString(), UPDATE_PRICE.toString())
              })
              it("exclusively items that have been listed", async () => {
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotListed")
              })
              it("must be owner", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  nftMarketplace = await ethers.getContract("NftMarketplace", player)
                  await expect(
                      nftMarketplace.updateListing(basicNft.address, TOKEN_ID, PRICE)
                  ).to.be.revertedWithCustomError(nftMarketplace, "NftMarketplace__NotOwner")
              })
          })

          describe("withdrawProceeds", () => {
              it("withdraws selles's proceeds", async () => {
                  const accounts = await ethers.getSigners()
                  deployer = accounts[0]
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)
                  const playerConnectedNftMarketplace = nftMarketplace.connect(player)
                  await playerConnectedNftMarketplace.buyItem(basicNft.address, TOKEN_ID, {
                      value: PRICE,
                  })
                  const deployerProceedsBefore = await nftMarketplace.getProceeds(deployer.address)
                  const deployerBalanceBefore = await deployer.getBalance()
                  const txResponse = await nftMarketplace.withdrawProceeds()
                  const txReceipt = await txResponse.wait(1)
                  const { gasUsed, effectiveGasPrice } = txReceipt
                  const gasCost = gasUsed.mul(effectiveGasPrice)
                  const deployerBalanceAfter = await deployer.getBalance()
                  const deployerProceeds = await nftMarketplace.getProceeds(deployer.address)
                  assert.equal(deployerProceeds.toString(), "0")
                  assert.equal(
                      deployerBalanceAfter.add(gasCost).toString(),
                      deployerProceedsBefore.add(deployerBalanceBefore).toString()
                  )

                  //TODO Test a failed transaction

                  //   it("reverts as expected on failed transaction", async function () {
                  //       const testHelperFactory = await ethers.getContractFactory("TestHelper")
                  //       testHelper = await testHelperFactory.deploy()
                  //       await testHelper.deployed()
                  //       await expect(testHelper.testWithdrawProceeds()).to.be.revertedWithCustomError(
                  //           nftMarketplace,
                  //           "NftMarketplace__TransferFailed"
                  //       )
                  //   })
              })
              it("reverts when proceeds are less that zero", async () => {
                  await expect(nftMarketplace.withdrawProceeds()).to.be.revertedWithCustomError(
                      nftMarketplace,
                      "NftMarketplace__NoProceeds"
                  )
              })
          })
          describe("getListings", () => {
              it("gets the right listing", async () => {
                  await nftMarketplace.listItem(basicNft.address, TOKEN_ID, PRICE)

                  const listing = await nftMarketplace.getListings(basicNft.address, TOKEN_ID)
                  assert.equal(listing.price.toString(), PRICE.toString())
                  assert.equal(listing.seller, deployer)
              })
          })
      })
