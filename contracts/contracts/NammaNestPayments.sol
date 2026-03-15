// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title NammaNestPayments
 * @notice Records search fee payments on GOAT Testnet3 (native BTC).
 *         Each search session requires a one-time payment before the AI agent runs.
 *         Owner can claim accumulated BTC from the contract at any time.
 */
contract NammaNestPayments {
    // ─── State ────────────────────────────────────────────────────────────────

    address public owner;
    uint256 public searchFee; // in wei
    uint256 public totalCollected; // cumulative BTC received (wei)
    uint256 public totalClaimed;   // cumulative BTC claimed by owner (wei)

    struct Payment {
        address payer;
        uint256 amount;
        uint256 timestamp;
        bool exists;
    }

    /// @dev sessionId (MongoDB ObjectId string) => Payment record
    mapping(bytes32 => Payment) private _payments;

    /// @dev payer address => number of searches paid
    mapping(address => uint256) public searchCount;

    // ─── Events ───────────────────────────────────────────────────────────────

    event PaymentReceived(
        address indexed payer,
        string sessionId,
        uint256 amount,
        uint256 timestamp
    );

    event TokensClaimed(address indexed to, uint256 amount, uint256 timestamp);
    event FeeUpdated(uint256 oldFee, uint256 newFee);
    event OwnershipTransferred(address indexed oldOwner, address indexed newOwner);

    // ─── Errors ───────────────────────────────────────────────────────────────

    error NotOwner();
    error InsufficientPayment(uint256 required, uint256 provided);
    error AlreadyPaid(string sessionId);
    error NothingToClaim();
    error TransferFailed();
    error InvalidFee();
    error ZeroAddress();

    // ─── Modifiers ────────────────────────────────────────────────────────────

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    // ─── Constructor ──────────────────────────────────────────────────────────

    /// @param _searchFee Initial search fee in wei (native BTC on GOAT Testnet3)
    constructor(uint256 _searchFee) {
        owner = msg.sender;
        searchFee = _searchFee;
        emit FeeUpdated(0, _searchFee);
    }

    // ─── Core ─────────────────────────────────────────────────────────────────

    /**
     * @notice Pay the search fee for a given session.
     * @param sessionId  MongoDB ObjectId string from /api/payment/initiate
     */
    function pay(string calldata sessionId) external payable {
        if (msg.value < searchFee) {
            revert InsufficientPayment(searchFee, msg.value);
        }

        bytes32 key = keccak256(abi.encodePacked(sessionId));
        if (_payments[key].exists) revert AlreadyPaid(sessionId);

        _payments[key] = Payment({
            payer: msg.sender,
            amount: searchFee,
            timestamp: block.timestamp,
            exists: true
        });

        searchCount[msg.sender]++;
        totalCollected += searchFee;

        emit PaymentReceived(msg.sender, sessionId, searchFee, block.timestamp);

        // Refund any excess BTC sent above the fee
        uint256 excess = msg.value - searchFee;
        if (excess > 0) {
            (bool ok, ) = payable(msg.sender).call{value: excess}("");
            if (!ok) revert TransferFailed();
        }
    }

    // ─── View helpers ─────────────────────────────────────────────────────────

    /// @notice Returns true if the session has been paid for.
    function isSessionPaid(string calldata sessionId) external view returns (bool) {
        return _payments[keccak256(abi.encodePacked(sessionId))].exists;
    }

    /// @notice Returns full payment details for a session.
    function getPayment(string calldata sessionId)
        external
        view
        returns (
            address payer,
            uint256 amount,
            uint256 timestamp,
            bool exists
        )
    {
        Payment memory p = _payments[keccak256(abi.encodePacked(sessionId))];
        return (p.payer, p.amount, p.timestamp, p.exists);
    }

    /// @notice Current unclaimed BTC balance held by the contract.
    function contractBalance() external view returns (uint256) {
        return address(this).balance;
    }

    /// @notice Pending (unclaimed) amount available for the owner to claim.
    function pendingClaim() external view returns (uint256) {
        return address(this).balance;
    }

    // ─── Owner — claim & admin ─────────────────────────────────────────────────

    /**
     * @notice Claim all accumulated BTC from the contract to the owner's wallet.
     *         Emits TokensClaimed with the amount transferred and timestamp.
     */
    function claimTokens() external onlyOwner {
        uint256 bal = address(this).balance;
        if (bal == 0) revert NothingToClaim();

        totalClaimed += bal;

        (bool ok, ) = payable(owner).call{value: bal}("");
        if (!ok) revert TransferFailed();

        emit TokensClaimed(owner, bal, block.timestamp);
    }

    /**
     * @notice Claim a specific amount of BTC to the owner's wallet.
     * @param amount Amount in wei to claim (must be <= contract balance)
     */
    function claimAmount(uint256 amount) external onlyOwner {
        uint256 bal = address(this).balance;
        if (amount == 0 || amount > bal) revert NothingToClaim();

        totalClaimed += amount;

        (bool ok, ) = payable(owner).call{value: amount}("");
        if (!ok) revert TransferFailed();

        emit TokensClaimed(owner, amount, block.timestamp);
    }

    /// @notice Update the search fee (in wei).
    function setSearchFee(uint256 _fee) external onlyOwner {
        if (_fee == 0) revert InvalidFee();
        emit FeeUpdated(searchFee, _fee);
        searchFee = _fee;
    }

    /// @notice Transfer ownership to a new address.
    function transferOwnership(address newOwner) external onlyOwner {
        if (newOwner == address(0)) revert ZeroAddress();
        emit OwnershipTransferred(owner, newOwner);
        owner = newOwner;
    }

    receive() external payable {}
}
