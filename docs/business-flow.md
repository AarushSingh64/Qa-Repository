# Capital POS - Business Flow Documentation

## Version

1.0

## Product Overview

Capital POS is a Multi-Tenant, Multi-Location Restaurant/Café ERP and POS platform.

The system supports:

* Multi-Tenant Architecture
* Multi-Location Operations
* Distribution Centers (DC)
* Stores
* Role-Based Access Control (RBAC)
* Inventory Management
* Purchase Management
* Stock Transfers
* Approval Workflows
* User Management

---

# 1. User Hierarchy

```text
Super Admin
    ↓
Tenant
    ↓
Locations
    ├── Distribution Center (DC)
    └── Store
    ↓
Users
    ↓
Roles
    ↓
Permissions
```

---

# 2. Tenant Onboarding Flow

## Step 1: Tenant Creation

Super Admin creates a Tenant.

Tenant information includes:

* Business Information
* Owner Information
* Contact Details
* Address Information
* Subscription Details
* Permissions Configuration

## Step 2: Temporary Credentials

After tenant creation:

* Temporary password is generated.
* Credentials are sent through email.

## Step 3: First Login

Tenant logs in using:

* Email Address OR
* Mobile Number

and temporary password.

## Step 4: Password Reset

Password reset is mandatory.

Tenant cannot continue without changing password.

## Step 5: ERP Setup

Tenant performs initial ERP configuration.

---

# 3. Location Management

Tenant can create multiple locations.

## Location Types

### Distribution Center (DC)

Used for:

* Purchasing
* Inventory Holding
* Stock Dispatch
* DC to DC Transfer

### Store

Used for:

* Stock Consumption
* Sales
* Stock Requests

---

## Business Rules

### BR-001

A tenant can create multiple DCs.

### BR-002

A tenant can create multiple Stores.

### BR-003

DC to DC stock transfer is allowed.

### BR-004

Store to Store stock transfer is allowed.

### BR-005

Store to DC stock transfer is currently not allowed.

---

# 4. User Management

Tenant creates users.

Users login using:

* Email Address OR
* Mobile Number
* Password

---

## User Assignment

Each user must be assigned:

* One Role
* One or Multiple Locations

---

## Business Rules

### BR-006

A user can belong to multiple locations.

### BR-007

A user can have only one role.

### BR-008

A role can be assigned to multiple users.

---

# 5. Role Based Access Control (RBAC)

The system follows RBAC architecture.

Permission structure:

```text
Module
    ↓
Submodule
    ↓
Action
```

Example:

```text
Inventory
    ↓
Items
    ↓
Create
Edit
Delete
View
```

---

## System Roles

Examples:

* Admin
* Business Head
* Location Admin
* Location Admin DC
* Location Admin Store
* Location Manager
* Inventory Manager
* Purchase Manager
* Accountant
* Support Staff
* System Auditor
* Customer

---

## Custom Roles

Tenant can create custom roles.

---

## Business Rules

### BR-009

Role name cannot be modified for system roles.

### BR-010

Role permissions can be modified.

### BR-011

System roles cannot be deleted.

### BR-012

Custom roles cannot be deleted once created.

---

# 6. Tenant Suspension Flow

Super Admin can:

* Activate Tenant
* Deactivate Tenant

---

## Business Rules

### BR-013

When Tenant is deactivated:

* Tenant login is blocked.
* User login is blocked.
* API access is blocked.

### BR-014

Tenant can be reactivated.

---

# 7. Item Management

Items are created at Tenant level.

Items can be created through:

* Manual Form
* Excel Import

---

## Business Rules

### BR-015

Items are not location specific.

### BR-016

Items belong to Tenant.

### BR-017

Item creation does not make item visible.

Item Mapping is required.

---

# 8. Item Mapping

Item Mapping controls location visibility.

Items are mapped to:

* DC
* Store

---

## Business Rules

### BR-018

Only mapped items are visible at location.

### BR-019

Only mapped items can participate in inventory transactions.

### BR-020

Store can request only mapped items.

### BR-021

DC can dispatch only mapped items.

### BR-022

Currently mapped items cannot be unmapped.

---

# 9. Inventory Management

Inventory is maintained location wise.

Each location maintains independent inventory.

---

## Stock Sources

### Opening Stock

Used during ERP migration.

### Purchase Order Receipt

Used for DC inventory addition.

### Stock Transfer

Used for inter-location movement.

### Stock Adjustment

Used for manual corrections.

---

## Business Rules

### BR-023

Inventory is maintained location-wise.

### BR-024

Stock cannot become negative.

### BR-025

Inventory movements must be auditable.

---

# 10. Purchase Management

Purchase process begins from DC.

---

## Purchase Workflow

```text
Purchase Order
    ↓
Approval Workflow
    ↓
Vendor Notification
    ↓
Goods Receipt
    ↓
Inventory Update
    ↓
Invoice Creation
    ↓
Payment
```

---

# 11. Purchase Approval Workflow

Approval workflow is configurable.

Supported Levels:

```text
0 to 10 Levels
```

---

## Approval Structure

```text
Approval Level
    ↓
Role
    ↓
User
```

Example:

```text
Level 1
Role: Purchase Manager
User: Rahul

Level 2
Role: Business Head
User: Amit
```

---

## Business Rules

### BR-026

Approval levels are configurable.

### BR-027

Approval sequence cannot be skipped.

### BR-028

Approvals occur sequentially.

### BR-029

PO can be rejected at any level.

### BR-030

Rejected PO cannot be edited.

### BR-031

Rejected PO cannot be resubmitted.

### BR-032

New PO must be created after rejection.

### BR-033

PO creator can approve own PO.

### BR-034

Approval is not amount based.

---

# 12. Vendor Notification

After final approval:

* Email is automatically sent to vendor.

---

# 13. Goods Receipt (GRN)

Vendor supplies material.

DC receives material.

Inventory is updated.

---

## Partial Receipt

Supported.

Example:

```text
Ordered = 100

Received = 70
```

Remaining:

```text
30
```

can be received later.

---

## Business Rules

### BR-035

Partial receipt is allowed.

### BR-036

Received quantity can be less than ordered quantity.

### BR-037

Over receipt must not be allowed.

---

# 14. Invoice Generation

Invoice is automatically generated after receipt.

---

## Business Rules

### BR-038

Invoice creation is automatic.

### BR-039

Invoice quantity must match received quantity.

---

# 15. Store Replenishment Workflow

Stores cannot directly purchase inventory.

Stores receive inventory from DC.

---

## Workflow

```text
Store
    ↓
Stock Request
    ↓
DC Approval
    ↓
Dispatch
    ↓
Store Receive
    ↓
Inventory Update
```

---

## Business Rules

### BR-040

Store can request only mapped items.

### BR-041

DC inventory manager approves request.

### BR-042

Approved requests can be dispatched.

### BR-043

Store inventory increases only after receive.

### BR-044

DC inventory decreases after dispatch.

---

# 16. Security Rules

### BR-045

Tenant A cannot access Tenant B data.

### BR-046

Users can access only assigned locations.

### BR-047

RBAC must be enforced on:

* UI
* APIs
* Direct URLs

### BR-048

Unauthorized actions must return Access Denied.

---

# 17. Critical Release Blocking Flows

The following flows are release blockers:

1. Tenant Creation
2. Password Reset
3. Location Creation
4. User Creation
5. Role Assignment
6. RBAC Authorization
7. Item Mapping
8. Purchase Approval Workflow
9. Goods Receipt
10. Inventory Posting
11. Store Stock Request
12. Dispatch Workflow
13. Store Receive Workflow
14. Tenant Isolation
15. Negative Inventory Prevention
16. Location Switching

```
```
