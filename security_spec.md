# Security Specification for Chico Rifa App

## Data Invariants
1. **Ticket Integrity**: A ticket must have a number between 1 and 200.
2. **Status Workflow**: 
   - A ticket starts as `available`.
   - A buyer can set it to `pending`.
   - Only an admin can set it to `approved` or reset it to `available`.
3. **Admin Authority**: Only authenticated administrators can modify the global configuration and approve/reset tickets.
4. **Buyer Integrity**: When a buyer reserves a ticket, they must provide a name and phone number.

## The "Dirty Dozen" Payloads
1. **Unauth Config Write**: Attempt to change `pixKey` without being an admin.
2. **Ghost Field in Config**: Attempt to add `secret_field: true` to the config document.
3. **Invalid Ticket Status**: Attempt to set a ticket status to `sold_externally` (not in enum).
4. **Ticket Takeover**: Attempt to change the `name` of an already `pending` ticket.
5. **ID Poisoning**: Attempt to create a ticket with ID `malicious_path_123`.
6. **Self-Approval**: A buyer attempting to set their own ticket status to `approved`.
7. **Config Deletion**: Attempting to delete the global settings document.
8. **Jumbo Phone**: Attempting to set a phone number with 10,000 characters.
9. **Negative Price**: Attempting to set `ticketPrice` to `-50`.
10. **Admin Pin Spoof**: Attempting to change `adminPin` as a non-admin.
11. **Massive Name**: Attempting to set a buyer name with 1MB of data.
12. **Orphaned Ticket**: Attempting to create a ticket number 999 (out of range).

## Test Runner Plan
- Implement tests to ensure all "Dirty Dozen" payloads return `PERMISSION_DENIED`.
- Verify that `isOwner` logic works for ticket reservations (if applicable, though here it's more about state transition).
- Verify `isAdmin` logic for config and approvals.
