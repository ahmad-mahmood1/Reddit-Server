import nodemailer from "nodemailer";

// async..await is not allowed in global scope, must use a wrapper
async function sendEmail(to: string, html: string): Promise<void> {
  // Generate test SMTP service account from ethereal.email
  // Only needed if you don't have a real mail account for testing

  //   let testAccount = await nodemailer.createTestAccount();

  // create reusable transporter object using the default SMTP transport
  let transporter = nodemailer.createTransport({
    host: "smtp.ethereal.email",
    port: 587,
    secure: false, // true for 465, false for other ports
    auth: {
      user: "pcezop6efxotz5gn@ethereal.email", // generated ethereal user
      pass: "91br72npQ6ykPwwYvS", // generated ethereal password
    },
  });

  // send mail with defined transport object
  let info = await transporter.sendMail({
    from: "ahmad.mahmood.a90@gmail.com", // sender address
    to, // list of receivers
    subject: "Change Password ✔", // Subject line
    html, // plain text body
  });

  // Preview only available when sending through an Ethereal account
  console.log("Preview URL: %s", nodemailer.getTestMessageUrl(info));
  // Preview URL: https://ethereal.email/message/WaQKMgKddxQDoou...
}

export default sendEmail;
