export const getInitialDemoData = () => {
  const now = new Date();
  
  // Helper to format ISO dates for today and previous days
  const getPastDate = (daysAgo, hours = 10, minutes = 30) => {
    const d = new Date();
    d.setDate(d.getDate() - daysAgo);
    d.setHours(hours, minutes, 0, 0);
    return d.toISOString();
  };

  return [
    {
      id: "SK-2026-001",
      customerName: "Ramesh Kumar Sharma",
      mobileNumber: "9876543210",
      address: "Plot 42, Green Park, Ward 5",
      serviceType: "Aadhaar Card Update / Correction",
      workDescription: "Mobile number linking & Address update with light bill copy",
      status: "In Progress",
      totalAmount: 150,
      paidAmount: 100,
      remainingBalance: 50,
      createdAt: getPastDate(0, 9, 15), // Today morning
      updatedAt: getPastDate(0, 9, 15)
    },
    {
      id: "SK-2026-002",
      customerName: "Priya Patel",
      mobileNumber: "9123456789",
      address: "Station Road, Near Bus Stand",
      serviceType: "PAN Card New / Correction",
      workDescription: "New PAN Card application under Instant e-PAN mode",
      status: "Completed",
      totalAmount: 250,
      paidAmount: 250,
      remainingBalance: 0,
      createdAt: getPastDate(0, 11, 45), // Today
      updatedAt: getPastDate(0, 14, 20)
    },
    {
      id: "SK-2026-003",
      customerName: "Sanjay Kumar Verma",
      mobileNumber: "9988776655",
      address: "House No 108, Shiv Nagar",
      serviceType: "Income Certificate (Aavak Daakhla)",
      workDescription: "Urgent 3-year Income Certificate for scholarship application",
      status: "Pending",
      totalAmount: 400,
      paidAmount: 150,
      remainingBalance: 250,
      createdAt: getPastDate(0, 14, 10), // Today
      updatedAt: getPastDate(0, 14, 10)
    },
    {
      id: "SK-2026-004",
      customerName: "Sunita Rajesh Singh",
      mobileNumber: "9456123789",
      address: "Village Rampur, Post Office Area",
      serviceType: "Ayushman Bharat Golden Card",
      workDescription: "E-KYC verification for 4 family members",
      status: "Completed",
      totalAmount: 200,
      paidAmount: 200,
      remainingBalance: 0,
      createdAt: getPastDate(1, 10, 30), // Yesterday
      updatedAt: getPastDate(1, 16, 0)
    },
    {
      id: "SK-2026-005",
      customerName: "Vikramaditya Chauhan",
      mobileNumber: "9711223344",
      address: "Sector 4, Market Complex",
      serviceType: "Passport Application",
      workDescription: "Normal Fresh Passport application booking & appointment slot",
      status: "Pending",
      totalAmount: 1800,
      paidAmount: 1000,
      remainingBalance: 800,
      createdAt: getPastDate(2, 11, 0),
      updatedAt: getPastDate(2, 11, 0)
    }
  ];
};
