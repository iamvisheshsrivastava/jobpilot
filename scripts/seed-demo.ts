import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'

const prisma = new PrismaClient()

const DEMO_EMAIL = 'demo@jobpilot.app'
const DEMO_PASSWORD = 'Demo123456'

function daysAgo(n: number) {
  const d = new Date(); d.setDate(d.getDate() - n); return d
}
function daysFromNow(n: number) {
  const d = new Date(); d.setDate(d.getDate() + n); return d
}

async function main() {
  // Delete existing demo user if present
  await prisma.user.deleteMany({ where: { email: DEMO_EMAIL } })

  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 12)
  const user = await prisma.user.create({
    data: { email: DEMO_EMAIL, name: 'Demo User', passwordHash },
  })

  const cats = await prisma.$transaction([
    prisma.category.create({ data: { userId: user.id, name: 'Germany – Software', displayOrder: 0 } }),
    prisma.category.create({ data: { userId: user.id, name: 'Germany – Data', displayOrder: 1 } }),
    prisma.category.create({ data: { userId: user.id, name: 'EU – Product', displayOrder: 2 } }),
  ])
  const [sw, da, pr] = cats

  const swJobs = [
    { title: 'Frontend Engineer', company: 'SAP SE', status: 'APPLIED', priority: 'HIGH', link: 'https://sap.com/careers', deadline: daysFromNow(12), dateAdded: daysAgo(8), comments: 'Applied via company site. Referral from LinkedIn contact.' },
    { title: 'Full Stack Developer', company: 'Zalando', status: 'INTERVIEW', priority: 'SUPER_HIGH', link: 'https://zalando.de/jobs', deadline: daysFromNow(5), dateAdded: daysAgo(14), comments: 'Phone screen done. Technical round scheduled for next week.' },
    { title: 'React Developer', company: 'Siemens Digital', status: 'IN_PROGRESS', priority: 'MEDIUM', deadline: daysFromNow(20), dateAdded: daysAgo(3) },
    { title: 'TypeScript Engineer', company: 'Bosch', status: 'REJECTED', priority: 'LOW', dateAdded: daysAgo(21), comments: 'Position filled internally.' },
    { title: 'Next.js Developer', company: 'OttoGroup', status: 'IN_PROGRESS', priority: 'HIGH', link: 'https://ottogroup.com', deadline: daysFromNow(8), dateAdded: daysAgo(2) },
    { title: 'Senior Software Engineer', company: 'Deutsche Bank Tech', status: 'LOOK_AGAIN', priority: 'HIGH', dateAdded: daysAgo(10), comments: 'Salary range too low. Will re-evaluate if they adjust.' },
    { title: 'Backend Developer (Node.js)', company: 'N26', status: 'INTERVIEW', priority: 'SUPER_HIGH', deadline: daysFromNow(3), dateAdded: daysAgo(18), comments: '2nd interview round. Very excited about this role!' },
    { title: 'Platform Engineer', company: 'Delivery Hero', status: 'APPLIED', priority: 'MEDIUM', link: 'https://careers.deliveryhero.com', dateAdded: daysAgo(1) },
  ]
  const daJobs = [
    { title: 'Data Analyst', company: 'Deutsche Telekom', status: 'APPLIED', priority: 'MEDIUM', dateAdded: daysAgo(7), deadline: daysFromNow(10) },
    { title: 'ML Engineer', company: 'Allianz', status: 'IN_PROGRESS', priority: 'HIGH', link: 'https://allianz.de/jobs', dateAdded: daysAgo(4), deadline: daysFromNow(18), comments: 'Great company culture. Python + AWS stack.' },
    { title: 'Data Scientist', company: 'BMW Group', status: 'LOOK_AGAIN', priority: 'LOW', dateAdded: daysAgo(15), comments: 'Requires relocation to Munich. Will consider later.' },
    { title: 'AI Research Scientist', company: 'Fraunhofer Institute', status: 'IN_PROGRESS', priority: 'SUPER_HIGH', dateAdded: daysAgo(2), deadline: daysFromNow(25), comments: 'Research role with publication opportunities. Very aligned with my interests.' },
    { title: 'MLOps Engineer', company: 'ING Germany', status: 'INTERVIEW', priority: 'HIGH', dateAdded: daysAgo(11), deadline: daysFromNow(2), comments: 'Final round interview. Strong candidate according to HR.' },
    { title: 'Analytics Engineer', company: 'Westwing', status: 'APPLIED', priority: 'HIGH', dateAdded: daysAgo(3), deadline: daysFromNow(7) },
  ]
  const prJobs = [
    { title: 'Product Manager', company: 'Spotify Berlin', status: 'APPLIED', priority: 'HIGH', link: 'https://spotify.com/jobs', dateAdded: daysAgo(9), deadline: daysFromNow(14), comments: 'Dream company. Applied with strong cover letter.' },
    { title: 'Product Analyst', company: 'Klarna', status: 'INTERVIEW', priority: 'MEDIUM', dateAdded: daysAgo(16), deadline: daysFromNow(4), comments: 'First round passed. Case study round next.' },
    { title: 'Senior Product Manager', company: 'Booking.com Amsterdam', status: 'APPLIED', priority: 'SUPER_HIGH', dateAdded: daysAgo(1), deadline: daysFromNow(21) },
    { title: 'UX Researcher', company: 'HelloFresh', status: 'IN_PROGRESS', priority: 'LOW', dateAdded: daysAgo(5) },
  ]

  let jobNumber = 1
  for (const job of swJobs) {
    await prisma.job.create({ data: { categoryId: sw.id, jobNumber: jobNumber++, ...job } })
  }
  for (const job of daJobs) {
    await prisma.job.create({ data: { categoryId: da.id, jobNumber: jobNumber++, ...job } })
  }
  for (const job of prJobs) {
    await prisma.job.create({ data: { categoryId: pr.id, jobNumber: jobNumber++, ...job } })
  }

  console.log(`✅ Demo account seeded: ${DEMO_EMAIL} / ${DEMO_PASSWORD}`)
  console.log(`   ${swJobs.length + daJobs.length + prJobs.length} jobs across 3 categories`)
}

main().catch(console.error).finally(() => prisma.$disconnect())
