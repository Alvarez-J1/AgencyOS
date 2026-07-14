const DEMO_USER = {
  name: 'Demo Account',
  email: 'demo@agencyos.com',
  password: 'password123'
};

const DAY_MS = 86_400_000;

const CLIENT_SEEDS = [
  ['Sarah Chen', 'Northwind Labs', 'sarah@northwind.io', 'Active', '2 days ago'],
  ['Marcus Lee', 'Brightwave Media', 'marcus@brightwave.co', 'Active', 'Yesterday'],
  ['Priya Patel', 'Atlas Logistics', 'priya@atlaslogistics.com', 'Onboarding', '3 days ago'],
  ['Daniel Romero', 'Vertex Studio', 'daniel@vertexstudio.design', 'Paused', '3 weeks ago'],
  ['Amelia Brooks', 'Riverbank Foods', 'amelia@riverbankfoods.com', 'Active', '4 days ago'],
  ['Jordan Kim', 'Meridian Health', 'jordan@meridianhealth.co', 'Active', 'Today'],
  ['Nora Williams', 'Apex Fitness', 'nora@apexfitness.com', 'Active', '5 days ago'],
  ['Leo Grant', 'Luna Coffee Co', 'leo@lunacoffee.co', 'Onboarding', '1 week ago'],
  ['Vivian Park', 'Harbor Legal Group', 'vivian@harborlegal.com', 'Active', 'Yesterday'],
  ['Owen Miller', 'Bluebird Travel', 'owen@bluebirdtravel.com', 'Paused', '2 weeks ago'],
  ['Elena Ruiz', 'EverPeak Outdoors', 'elena@everpeak.co', 'Active', '6 days ago'],
  ['Theo Bennett', 'NovaStack Systems', 'theo@novastack.io', 'Active', '3 days ago'],
  ['Maya Iyer', 'Greenfield Solar', 'maya@greenfieldsolar.com', 'Active', '1 week ago'],
  ['Caleb Foster', 'Crescent Education', 'caleb@crescent.edu', 'Active', '2 days ago'],
  ['Iris Morgan', 'Maple & Co Retail', 'iris@maplecoretail.com', 'Active', 'Yesterday'],
  ['Henry Wallace', 'Stonebridge Realty', 'henry@stonebridgerealty.com', 'Active', '4 days ago'],
  ['Ari Cohen', 'Clearpath Finance', 'ari@clearpathfinance.com', 'Active', 'Today'],
  ['Tessa Quinn', 'Kinetic Studios', 'tessa@kineticstudios.tv', 'Active', '9 days ago'],
  ['Milo Hart', 'Horizon Dental', 'milo@horizondental.com', 'Onboarding', '5 days ago'],
  ['Grace Lin', 'UrbanNest Living', 'grace@urbannestliving.com', 'Active', '1 week ago'],
  ['Julian Price', 'Silverline Events', 'julian@silverlineevents.com', 'Active', '2 days ago'],
  ['Amina Yusuf', 'PeakPoint Consulting', 'amina@peakpoint.consulting', 'Active', '6 days ago'],
  ['Elliot Hayes', 'Redwood Civic', 'elliot@redwoodcivic.org', 'Active', 'Yesterday'],
  ['Sophie Laurent', 'Opal Skincare', 'sophie@opalskincare.com', 'Onboarding', '4 days ago']
];

const PROJECT_SEEDS = [
  { id: 1, name: 'Website Redesign', client: 'Northwind Labs', status: 'In Progress', dueInDays: 9, progress: 68, createdDaysAgo: 42, updatedDaysAgo: 1, notes: 'New marketing site with refreshed brand system.' },
  { id: 2, name: 'Q3 Brand Campaign', client: 'Brightwave Media', status: 'Planning', dueInDays: 18, progress: 28, createdDaysAgo: 21, updatedDaysAgo: 2, notes: 'Multi-channel launch for the autumn product line.' },
  { id: 3, name: 'Partner Onboarding Portal', client: 'Atlas Logistics', status: 'Review', dueInDays: 5, progress: 86, createdDaysAgo: 55, updatedDaysAgo: 1, notes: 'Self-serve onboarding flow for new partners.' },
  { id: 4, name: 'Mobile App Relaunch', client: 'Northwind Labs', status: 'Completed', dueInDays: -18, progress: 100, createdDaysAgo: 80, updatedDaysAgo: 17, notes: 'Shipped the redesigned mobile experience.' },
  { id: 5, name: 'Retail Analytics Dashboard', client: 'Maple & Co Retail', status: 'In Progress', dueInDays: 14, progress: 52, createdDaysAgo: 29, updatedDaysAgo: 1, notes: 'Executive reporting dashboard for weekly revenue reviews.' },
  { id: 6, name: 'Patient Intake Automation', client: 'Meridian Health', status: 'Review', dueInDays: 7, progress: 74, createdDaysAgo: 47, updatedDaysAgo: 2, notes: 'Automated intake flow for new patient requests.' },
  { id: 7, name: 'Paid Social Launch', client: 'Luna Coffee Co', status: 'Planning', dueInDays: 21, progress: 22, createdDaysAgo: 14, updatedDaysAgo: 3, notes: 'Creative and media plan for seasonal subscriptions.' },
  { id: 8, name: 'Client Portal Refresh', client: 'Harbor Legal Group', status: 'In Progress', dueInDays: -2, progress: 61, createdDaysAgo: 36, updatedDaysAgo: 1, notes: 'Secure portal UX improvements for recurring clients.' },
  { id: 9, name: 'Solar Quote Calculator', client: 'Greenfield Solar', status: 'Completed', dueInDays: -11, progress: 100, createdDaysAgo: 65, updatedDaysAgo: 10, notes: 'Interactive quote calculator for residential prospects.' },
  { id: 10, name: 'Learning Platform Pilot', client: 'Crescent Education', status: 'In Progress', dueInDays: 24, progress: 44, createdDaysAgo: 24, updatedDaysAgo: 3, notes: 'Pilot workspace for course enrollment and reporting.' },
  { id: 11, name: 'Investor Reporting Suite', client: 'Clearpath Finance', status: 'Review', dueInDays: 3, progress: 82, createdDaysAgo: 52, updatedDaysAgo: 1, notes: 'Quarterly reporting tools for investor communications.' },
  { id: 12, name: 'Property Listing Microsite', client: 'Stonebridge Realty', status: 'In Progress', dueInDays: 12, progress: 57, createdDaysAgo: 31, updatedDaysAgo: 2, notes: 'Microsite for a new luxury property portfolio.' },
  { id: 13, name: 'Conference Campaign', client: 'Silverline Events', status: 'Planning', dueInDays: 28, progress: 18, createdDaysAgo: 11, updatedDaysAgo: 2, notes: 'Launch plan for a regional leadership conference.' },
  { id: 14, name: 'Studio Booking Flow', client: 'Kinetic Studios', status: 'Completed', dueInDays: -25, progress: 100, createdDaysAgo: 74, updatedDaysAgo: 24, notes: 'Booking flow and automated confirmation emails.' },
  { id: 15, name: 'Wellness Retention Program', client: 'Apex Fitness', status: 'In Progress', dueInDays: 16, progress: 49, createdDaysAgo: 26, updatedDaysAgo: 2, notes: 'Lifecycle campaign for annual membership renewals.' },
  { id: 16, name: 'Civic Grants Tracker', client: 'Redwood Civic', status: 'Review', dueInDays: -4, progress: 78, createdDaysAgo: 49, updatedDaysAgo: 1, notes: 'Grant application tracker for internal program teams.' }
];

const TASK_SEEDS = [
  { id: 1, project: 'Website Redesign', title: 'Approve final sitemap', assignee: 'Mia Torres', priority: 'Medium', status: 'Completed', dueInDays: -28, createdDaysAgo: 70, completedDaysAgo: 58, notes: 'Client approved the revised navigation.' },
  { id: 2, project: 'Website Redesign', title: 'Finalize homepage mockups', assignee: 'Ethan Brooks', priority: 'High', status: 'Completed', dueInDays: -26, createdDaysAgo: 68, completedDaysAgo: 55, notes: 'Desktop and mobile mockups approved.' },
  { id: 3, project: 'Mobile App Relaunch', title: 'Audit onboarding analytics', assignee: 'Ava King', priority: 'Medium', status: 'Completed', dueInDays: -25, createdDaysAgo: 66, completedDaysAgo: 53, notes: 'Baseline funnel report shared with product.' },
  { id: 4, project: 'Studio Booking Flow', title: 'Map booking confirmation emails', assignee: 'Noah Reed', priority: 'Low', status: 'Completed', dueInDays: -23, createdDaysAgo: 64, completedDaysAgo: 50, notes: 'Email sequence moved into QA.' },
  { id: 5, project: 'Solar Quote Calculator', title: 'Validate savings formula', assignee: 'Sofia Martinez', priority: 'High', status: 'Completed', dueInDays: -21, createdDaysAgo: 62, completedDaysAgo: 48, notes: 'Updated the incentive calculation.' },
  { id: 6, project: 'Partner Onboarding Portal', title: 'Create partner invite states', assignee: 'Liam Carter', priority: 'Medium', status: 'Completed', dueInDays: -20, createdDaysAgo: 60, completedDaysAgo: 46, notes: 'Empty, pending, and expired states delivered.' },
  { id: 7, project: 'Client Portal Refresh', title: 'Write secure upload copy', assignee: 'Maya Singh', priority: 'Low', status: 'Completed', dueInDays: -19, createdDaysAgo: 58, completedDaysAgo: 44, notes: 'Legal approved the final language.' },
  { id: 8, project: 'Investor Reporting Suite', title: 'Build KPI export view', assignee: 'Demo Account', priority: 'High', status: 'Completed', dueInDays: -17, createdDaysAgo: 56, completedDaysAgo: 42, notes: 'CSV export reviewed by finance team.' },
  { id: 9, project: 'Retail Analytics Dashboard', title: 'Normalize sales channels', assignee: 'Mia Torres', priority: 'Medium', status: 'Completed', dueInDays: -16, createdDaysAgo: 54, completedDaysAgo: 40, notes: 'Mapped store, marketplace, and wholesale revenue.' },
  { id: 10, project: 'Patient Intake Automation', title: 'Draft HIPAA-safe form copy', assignee: 'Ava King', priority: 'High', status: 'Completed', dueInDays: -15, createdDaysAgo: 52, completedDaysAgo: 38, notes: 'Compliance copy moved to client review.' },
  { id: 11, project: 'Q3 Brand Campaign', title: 'Compile audience segments', assignee: 'Noah Reed', priority: 'Medium', status: 'Completed', dueInDays: -13, createdDaysAgo: 50, completedDaysAgo: 36, notes: 'Segments aligned with paid media budget.' },
  { id: 12, project: 'Property Listing Microsite', title: 'Select listing photography', assignee: 'Sofia Martinez', priority: 'Low', status: 'Completed', dueInDays: -12, createdDaysAgo: 48, completedDaysAgo: 35, notes: 'Hero image set approved by broker.' },
  { id: 13, project: 'Learning Platform Pilot', title: 'Prepare enrollment import', assignee: 'Liam Carter', priority: 'Medium', status: 'Completed', dueInDays: -11, createdDaysAgo: 46, completedDaysAgo: 33, notes: 'CSV import tested with sample roster.' },
  { id: 14, project: 'Wellness Retention Program', title: 'Define renewal segments', assignee: 'Maya Singh', priority: 'Medium', status: 'Completed', dueInDays: -9, createdDaysAgo: 44, completedDaysAgo: 32, notes: 'Lifecycle buckets ready for automation.' },
  { id: 15, project: 'Civic Grants Tracker', title: 'Create grant status taxonomy', assignee: 'Demo Account', priority: 'High', status: 'Completed', dueInDays: -8, createdDaysAgo: 42, completedDaysAgo: 31, notes: 'Statuses matched to internal program language.' },
  { id: 16, project: 'Conference Campaign', title: 'Draft sponsor landing copy', assignee: 'Ethan Brooks', priority: 'Medium', status: 'Completed', dueInDays: -7, createdDaysAgo: 40, completedDaysAgo: 29, notes: 'Sponsor value props sent to events team.' },
  { id: 17, project: 'Website Redesign', title: 'QA responsive navigation', assignee: 'Mia Torres', priority: 'High', status: 'Completed', dueInDays: -6, createdDaysAgo: 38, completedDaysAgo: 27, notes: 'Navigation verified across desktop and mobile.' },
  { id: 18, project: 'Retail Analytics Dashboard', title: 'Design executive metric cards', assignee: 'Ava King', priority: 'Medium', status: 'Completed', dueInDays: -5, createdDaysAgo: 36, completedDaysAgo: 24, notes: 'Metric hierarchy approved.' },
  { id: 19, project: 'Patient Intake Automation', title: 'Connect referral intake queue', assignee: 'Liam Carter', priority: 'High', status: 'Completed', dueInDays: -4, createdDaysAgo: 34, completedDaysAgo: 22, notes: 'Queue routing tested with mock referrals.' },
  { id: 20, project: 'Investor Reporting Suite', title: 'Review investor dashboard filters', assignee: 'Demo Account', priority: 'Medium', status: 'Completed', dueInDays: -3, createdDaysAgo: 32, completedDaysAgo: 20, notes: 'Date range and entity filters approved.' },
  { id: 21, project: 'Client Portal Refresh', title: 'Polish document request states', assignee: 'Sofia Martinez', priority: 'Medium', status: 'Completed', dueInDays: -2, createdDaysAgo: 30, completedDaysAgo: 18, notes: 'Request and completed states refined.' },
  { id: 22, project: 'Learning Platform Pilot', title: 'Test facilitator dashboard', assignee: 'Noah Reed', priority: 'Medium', status: 'Completed', dueInDays: -1, createdDaysAgo: 28, completedDaysAgo: 16, notes: 'Pilot admins signed off on dashboard.' },
  { id: 23, project: 'Q3 Brand Campaign', title: 'Approve launch messaging', assignee: 'Maya Singh', priority: 'High', status: 'Completed', dueInDays: 0, createdDaysAgo: 26, completedDaysAgo: 14, notes: 'Messaging approved for first campaign sprint.' },
  { id: 24, project: 'Property Listing Microsite', title: 'Optimize property gallery', assignee: 'Ava King', priority: 'Medium', status: 'Completed', dueInDays: 1, createdDaysAgo: 24, completedDaysAgo: 12, notes: 'Gallery performance improved.' },
  { id: 25, project: 'Wellness Retention Program', title: 'Write retention email variants', assignee: 'Ethan Brooks', priority: 'Medium', status: 'Completed', dueInDays: 1, createdDaysAgo: 22, completedDaysAgo: 10, notes: 'Three variants ready for A/B testing.' },
  { id: 26, project: 'Civic Grants Tracker', title: 'Review program owner workflow', assignee: 'Demo Account', priority: 'High', status: 'Completed', dueInDays: 2, createdDaysAgo: 20, completedDaysAgo: 8, notes: 'Workflow aligned with grant review cadence.' },
  { id: 27, project: 'Conference Campaign', title: 'Build speaker announcement draft', assignee: 'Mia Torres', priority: 'Low', status: 'Completed', dueInDays: 3, createdDaysAgo: 18, completedDaysAgo: 6, notes: 'Draft ready for stakeholder review.' },
  { id: 28, project: 'Paid Social Launch', title: 'Prepare creative testing matrix', assignee: 'Sofia Martinez', priority: 'Medium', status: 'Completed', dueInDays: 4, createdDaysAgo: 16, completedDaysAgo: 5, notes: 'Testing plan handed to media buyer.' },
  { id: 29, project: 'Client Portal Refresh', title: 'Resolve overdue security review', assignee: 'Liam Carter', priority: 'High', status: 'Completed', dueInDays: -6, createdDaysAgo: 18, completedDaysAgo: 4, notes: 'Security checklist is complete.' },
  { id: 30, project: 'Civic Grants Tracker', title: 'Finalize reviewer permissions', assignee: 'Maya Singh', priority: 'High', status: 'Completed', dueInDays: -3, createdDaysAgo: 15, completedDaysAgo: 3, notes: 'Reviewer roles confirmed.' },
  { id: 31, project: 'Investor Reporting Suite', title: 'Patch variance chart labels', assignee: 'Noah Reed', priority: 'Medium', status: 'Completed', dueInDays: -1, createdDaysAgo: 12, completedDaysAgo: 1, notes: 'Final chart labels approved.' },
  { id: 32, project: 'Partner Onboarding Portal', title: 'QA onboarding flow', assignee: 'Demo Account', priority: 'High', status: 'Completed', dueInDays: 2, createdDaysAgo: 10, completedDaysAgo: 0, notes: 'Tested edge cases for partner invites.' },
  { id: 33, project: 'Website Redesign', title: 'Prepare launch checklist', assignee: 'Mia Torres', priority: 'Medium', status: 'In Progress', dueInDays: 5, createdDaysAgo: 9, updatedDaysAgo: 1, notes: 'Checklist is in client review.' },
  { id: 34, project: 'Retail Analytics Dashboard', title: 'Connect forecast data source', assignee: 'Liam Carter', priority: 'High', status: 'In Progress', dueInDays: 8, createdDaysAgo: 8, updatedDaysAgo: 2, notes: 'API credentials received from client.' },
  { id: 35, project: 'Patient Intake Automation', title: 'Run intake regression tests', assignee: 'Ava King', priority: 'Medium', status: 'In Progress', dueInDays: 6, createdDaysAgo: 7, updatedDaysAgo: 1, notes: 'Testing the insurance handoff path.' },
  { id: 36, project: 'Learning Platform Pilot', title: 'Review cohort reporting', assignee: 'Noah Reed', priority: 'Low', status: 'In Progress', dueInDays: 11, createdDaysAgo: 6, updatedDaysAgo: 2, notes: 'Report layout needs one more pass.' },
  { id: 37, project: 'Q3 Brand Campaign', title: 'Draft paid media naming system', assignee: 'Ethan Brooks', priority: 'Medium', status: 'Todo', dueInDays: -2, createdDaysAgo: 6, updatedDaysAgo: 3, notes: 'Naming system is blocking campaign setup.' },
  { id: 38, project: 'Paid Social Launch', title: 'Upload first creative batch', assignee: 'Sofia Martinez', priority: 'High', status: 'Todo', dueInDays: 1, createdDaysAgo: 5, updatedDaysAgo: 2, notes: 'Assets are ready for platform upload.' },
  { id: 39, project: 'Conference Campaign', title: 'Confirm keynote sponsor slot', assignee: 'Demo Account', priority: 'High', status: 'Todo', dueInDays: 3, createdDaysAgo: 5, updatedDaysAgo: 2, notes: 'Sponsor decision needed before program launch.' },
  { id: 40, project: 'Wellness Retention Program', title: 'Schedule lifecycle automation QA', assignee: 'Maya Singh', priority: 'Medium', status: 'Todo', dueInDays: 7, createdDaysAgo: 4, updatedDaysAgo: 1, notes: 'Coordinate QA with client success team.' },
  { id: 41, project: 'Property Listing Microsite', title: 'Add neighborhood highlights', assignee: 'Ava King', priority: 'Low', status: 'Todo', dueInDays: 9, createdDaysAgo: 4, updatedDaysAgo: 1, notes: 'Broker provided the final highlight list.' },
  { id: 42, project: 'Retail Analytics Dashboard', title: 'Document weekly reporting workflow', assignee: 'Noah Reed', priority: 'Low', status: 'Todo', dueInDays: 12, createdDaysAgo: 3, updatedDaysAgo: 1, notes: 'Document handoff process for operators.' },
  { id: 43, project: 'Patient Intake Automation', title: 'Prepare intake training deck', assignee: 'Ethan Brooks', priority: 'Medium', status: 'Todo', dueInDays: 14, createdDaysAgo: 2, updatedDaysAgo: 1, notes: 'Training deck for clinic coordinators.' },
  { id: 44, project: 'Conference Campaign', title: 'Build attendee segmentation brief', assignee: 'Mia Torres', priority: 'Medium', status: 'Todo', dueInDays: 17, createdDaysAgo: 2, updatedDaysAgo: 1, notes: 'Segmentation brief for event nurture flow.' }
];

const addDays = (date, days) => new Date(date.getTime() + days * DAY_MS);
const formatDate = (date) => date.toISOString().slice(0, 10);

const getAnchorDate = (referenceDate) => {
  const date = new Date(referenceDate);
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
};

const buildDemoWorkspace = (referenceDate = new Date()) => {
  const anchorDate = getAnchorDate(referenceDate);
  const activeProjectCounts = PROJECT_SEEDS.reduce((counts, project) => {
    if (project.status !== 'Completed') {
      counts.set(project.client, (counts.get(project.client) || 0) + 1);
    }

    return counts;
  }, new Map());

  const clients = CLIENT_SEEDS.map(([name, company, email, status, lastContact], index) => ({
    id: index + 1,
    name,
    company,
    email,
    status,
    activeProjects: activeProjectCounts.get(company) || 0,
    lastContact,
    createdAt: addDays(anchorDate, -70 + index),
    updatedAt: addDays(anchorDate, -Math.min(index + 1, 12))
  }));

  const projects = PROJECT_SEEDS.map(({ createdDaysAgo, dueInDays, updatedDaysAgo, ...project }) => ({
    ...project,
    dueDate: formatDate(addDays(anchorDate, dueInDays)),
    createdAt: addDays(anchorDate, -createdDaysAgo),
    updatedAt: addDays(anchorDate, -updatedDaysAgo)
  }));

  const tasks = TASK_SEEDS.map(({ completedDaysAgo, createdDaysAgo, dueInDays, updatedDaysAgo, ...task }) => {
    const completedAt = completedDaysAgo === undefined ? undefined : addDays(anchorDate, -completedDaysAgo);

    return {
      ...task,
      dueDate: formatDate(addDays(anchorDate, dueInDays)),
      ...(completedAt ? { completedAt } : {}),
      createdAt: addDays(anchorDate, -createdDaysAgo),
      updatedAt: completedAt || addDays(anchorDate, -(updatedDaysAgo ?? 1))
    };
  });

  return { clients, projects, tasks };
};

module.exports = { DEMO_USER, buildDemoWorkspace };
