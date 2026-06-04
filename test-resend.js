import { Resend } from 'resend';

const resend = new Resend('re_8GtFYeok_AuPJ3yXbJ9qACpzrmSwrCxYn');

async function test() {
  const { data, error } = await resend.emails.send({
    from: 'Sea of Blue <onboarding@seaofblue.app>',
    to: 'kxngmalik17@gmail.com',
    subject: 'Test',
    html: '<p>Test</p>'
  });
  console.log('Data:', data);
  console.log('Error:', error);
}
test();
