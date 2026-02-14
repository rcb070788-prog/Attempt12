/**
 * Application configuration: officials directory, external URLs, etc.
 */

export const TN_VOTER_LOOKUP_URL = "https://tnmap.tn.gov/voterlookup/";

export const OFFICIALS = [
  // Courthouse Officials
  { id: 'mayor', category: 'Courthouse', office: 'Mayor', name: 'Sloan Stewart', phone: '(931) 759-7076', email: 'sstewart@metromoorecounty.org' },
  { id: 'attorney', category: 'Courthouse', office: 'County Attorney', name: 'Bill Rieder', phone: '(931) 455-5478', email: '' },
  { id: 'clerk-master', category: 'Courthouse', office: 'Clerk & Master', name: 'Tammy Roberts', phone: '(931) 759-7028', email: 'Tammy.Roberts@tncourts.gov' },
  { id: 'judge', category: 'Courthouse', office: 'General Sessions Court Judge', name: 'Terry Gregory', phone: '(931) 455-5407', email: '' },
  { id: 'circuit-clerk', category: 'Courthouse', office: 'Circuit Court Clerk', name: 'Linda Wolaver', phone: '(931) 759-7208', email: '' },
  { id: 'deeds', category: 'Courthouse', office: 'Register of Deeds', name: 'Pam Wells', phone: '(931) 759-7913', email: 'mooretn@titlesearcher.com' },
  { id: 'clerk', category: 'Courthouse', office: 'County Clerk', name: 'Lacy Ivey', phone: '(931) 759-7346', email: 'Lacy.ivey@tn.gov' },
  { id: 'assessor', category: 'Courthouse', office: 'Property Assessor', name: 'Shaun Sherrill', phone: '(931) 759-7044', email: 'shaun.sherrill@cot.tn.gov' },
  { id: 'trustee', category: 'Courthouse', office: 'Trustee', name: 'Lynn Harrison', phone: '(931) 759-7912', email: 'trustee@metromoorecounty.org' },
  // Non-Courthouse Officials
  { id: 'highway', category: 'Non-Courthouse', office: 'Highway Department Superintendent', name: 'Shannon Cauble', phone: '(931) 759-7800', email: 'mchd@metromoorecounty.org' },
  { id: 'sheriff', category: 'Non-Courthouse', office: 'Sheriff', name: 'Tyler Hatfield', phone: '(931) 759-6464', email: 'THATFIELD@METROMOORECOUNTY.ORG' },
  { id: 'schools', category: 'Non-Courthouse', office: 'Director of Schools', name: 'Chad Moorehead', phone: '(931) 759-7303', email: 'mcdos@moorecountyschools.net' },
  { id: 'elections', category: 'Non-Courthouse', office: 'Administrator of Elections', name: 'Jim Sanders', phone: '(931) 759-4532', email: '' },
  // Council Members
  { id: 'c-d1-1', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Amy Cashion', phone: '(931) 607-4526', email: 'cashion_5412@bellsouth.net' },
  { id: 'c-d1-2', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Sunny Rae Moorehead', phone: '', email: 'sunnyraemcd1@gmail.com' },
  { id: 'c-d1-3', category: 'Council Members', district: '1', office: 'Council Member District 1', name: 'Shane Taylor', phone: '(931) 224-5763', email: 'shanetaylor@metromoorecounty.org' },
  { id: 'c-d2-1', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'Robert Bracewell', phone: '(931) 434-0384', email: 'moorecotnd2@gmail.com' },
  { id: 'c-d2-2', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'Douglas Carson II', phone: '(931) 307-9267', email: 'douglas.carson.312@gmail.com' },
  { id: 'c-d2-3', category: 'Council Members', district: '2', office: 'Council Member District 2', name: 'John Taylor', phone: '(931) 928-1653', email: 'jet.district2council@gmail.com' },
  { id: 'c-d3-1', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Marty Cashion', phone: '(931) 307-9355', email: 'mmcashiondistrict2@gmail.com' },
  { id: 'c-d3-2', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Dexter Golden', phone: '(931) 703-6506', email: 'Dexter_golden@outlook.com' },
  { id: 'c-d3-3', category: 'Council Members', district: '3', office: 'Council Member District 3', name: 'Houston Lindsey', phone: '(931) 632-3005', email: 'hdl.district3council@gmail.com' },
  { id: 'c-d4-1', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Peggy Sue Blackburn', phone: '(615) 504-8574', email: 'tryax1962@gmail.com' },
  { id: 'c-d4-2', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Arvis Bobo', phone: '(931) 581-1264', email: 'bosacre@gmail.com' },
  { id: 'c-d4-3', category: 'Council Members', district: '4', office: 'Council Member District 4', name: 'Bradley Dye', phone: '(931) 307-9201', email: 'bradleydye@hotmail.com' },
  { id: 'c-d5-1', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Gerald Burnett', phone: '(931) 632-2081', email: 'burnett.mcdistrict5@gmail.com' },
  { id: 'c-d5-2', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Greg Guinn', phone: '(931) 224-7976', email: 'gregguinn72@gmail.com' },
  { id: 'c-d5-3', category: 'Council Members', district: '5', office: 'Council Member District 5', name: 'Jimmy Hammond', phone: '(931) 247-2138', email: 'jimhammond02@gmail.com' },
  // School Board
  { id: 'sb-d1', category: 'School Board', district: '1', office: 'School Board Member District 1', name: 'Ed Cashion', phone: '', email: 'ed.cashion@moorecountyschools.net' },
  { id: 'sb-d2', category: 'School Board', district: '2', office: 'School Board Member District 2', name: 'Carrie Barnett', phone: '', email: 'carrie.barnett@moorecountyschools.net' },
  { id: 'sb-d3', category: 'School Board', district: '3', office: 'School Board Member District 3', name: 'Jammie Cashion', phone: '', email: 'jammie.cashion@moorecountyschools.net' },
  { id: 'sb-d4', category: 'School Board', district: '4', office: 'School Board Member District 4', name: 'Kaleigh Hatfield', phone: '', email: 'kaleigh.hatfield@moorecountyschools.net' },
  { id: 'sb-d5', category: 'School Board', district: '5', office: 'School Board Member District 5', name: 'Tanya Vann', phone: '', email: 'tanya.vann@moorecountyschools.net' },
];
