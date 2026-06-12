/**
 * Security Audit Verification & Automated Permission Tests
 * Run using node to verify logical access control rules.
 */

// Mock Database & Data Structs
const TabView = {
    DASHBOARD: 'Dashboard',
    INVENTORY: 'Inventory',
    EXPENSES: 'Expenses'
};

function resolveTabRole(currentUser, activeTab) {
    const isSuperAdmin = currentUser?.email?.toLowerCase() === 'sreekumar.career@gmail.com';
    const isSystemAdmin = isSuperAdmin || currentUser.role === 'SYSTEM_ADMIN';
    
    if (isSuperAdmin || currentUser.role === 'SYSTEM_ADMIN') return 'Admin';
    const explicit = currentUser.permissions?.[activeTab];
    if (explicit) return explicit;
    return 'Employee';
}

function normalizePermissions(permissions) {
    if (Array.isArray(permissions)) {
        return permissions.reduce((acc, tab) => ({ ...acc, [tab]: 'Employee' }), {});
    }
    return permissions || {};
}

function validateEmployeeUpdate(currentUser, targetEmployeeId, updates, existingEmployee) {
    const isSystemAdmin = currentUser?.role === 'SYSTEM_ADMIN' || currentUser?.email === 'sreekumar.career@gmail.com';
    
    if (!isSystemAdmin && currentUser?.id !== targetEmployeeId) {
        throw new Error("Access Denied: Only SYSTEM_ADMIN can update other employee records.");
    }
    
    if (!isSystemAdmin && currentUser?.id === targetEmployeeId) {
        if (updates.role !== undefined && updates.role !== existingEmployee?.role) {
            throw new Error("Access Denied: Cannot modify your own role.");
        }
        if (updates.permissions !== undefined) {
            throw new Error("Access Denied: Cannot modify your own permissions.");
        }
    }
    
    return true;
}

// Test Runner
const tests = [
    {
        name: "Super Admin Override Check",
        fn: () => {
            const user = { email: 'sreekumar.career@gmail.com', role: 'SYSTEM_STAFF' };
            const role = resolveTabRole(user, TabView.INVENTORY);
            if (role !== 'Admin') throw new Error(`Expected Admin, got ${role}`);
        }
    },
    {
        name: "System Admin Unrestricted Check",
        fn: () => {
            const user = { email: 'admin@medequip.com', role: 'SYSTEM_ADMIN', permissions: { [TabView.INVENTORY]: 'Employee' } };
            const role = resolveTabRole(user, TabView.INVENTORY);
            if (role !== 'Admin') throw new Error(`Expected Admin to bypass explicit Employee grid override, got ${role}`);
        }
    },
    {
        name: "Standard Staff Grid Override Check",
        fn: () => {
            const user = { email: 'staff@medequip.com', role: 'SYSTEM_STAFF', permissions: { [TabView.INVENTORY]: 'Admin' } };
            const role = resolveTabRole(user, TabView.INVENTORY);
            if (role !== 'Admin') throw new Error(`Expected Admin from explicit grid override, got ${role}`);
        }
    },
    {
        name: "Legacy Array Normalization Check",
        fn: () => {
            const legacyPerms = [TabView.DASHBOARD, TabView.INVENTORY];
            const normalized = normalizePermissions(legacyPerms);
            if (normalized[TabView.INVENTORY] !== 'Employee') throw new Error(`Expected Employee mapping after legacy normalization`);
        }
    },
    {
        name: "Privilege Escalation Validation Check",
        fn: () => {
            const user = { id: 'EMP001', email: 'staff@medequip.com', role: 'SYSTEM_STAFF' };
            const existing = { id: 'EMP001', email: 'staff@medequip.com', role: 'SYSTEM_STAFF' };
            
            try {
                validateEmployeeUpdate(user, 'EMP001', { role: 'SYSTEM_ADMIN' }, existing);
                throw new Error("Vulnerability: Employee successfully self-escalated role!");
            } catch (err) {
                if (!err.message.includes("Access Denied")) throw err;
            }
        }
    }
];

console.log("=== Running Security & Permission Test Suite ===");
let passed = 0;
tests.forEach(t => {
    try {
        t.fn();
        console.log(`[PASS] ${t.name}`);
        passed++;
    } catch (e) {
        console.error(`[FAIL] ${t.name}: ${e.message}`);
    }
});

console.log(`\nResult: ${passed}/${tests.length} tests passed successfully.`);
if (passed !== tests.length) {
    process.exit(1);
}
