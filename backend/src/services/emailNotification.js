/**
 * Email Notification Service
 * Sends order status update emails to customers
 */

const nodemailer = require('nodemailer');

// Create transporter with SMTP configuration
let transporter = null;

function getTransporter() {
  if (!transporter) {
    transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT || '587'),
      secure: process.env.SMTP_SECURE === 'true', // true for 465, false for other ports
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });
  }
  return transporter;
}

/**
 * Format currency to Indonesian Rupiah
 */
function formatRupiah(amount) {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    minimumFractionDigits: 0,
  }).format(amount);
}

/**
 * Generate email subject based on status
 */
function getEmailSubject(status, orderCode) {
  const subjects = {
    paid: `Pembayaran Diterima - Pesanan ${orderCode}`,
    processing: `Pesanan Diproses - ${orderCode}`,
    shipped: `Pesanan Dikirim - ${orderCode}`,
    delivered: `Pesanan Diterima - ${orderCode}`,
    cancelled: `Pesanan Dibatalkan - ${orderCode}`,
  };
  return subjects[status] || `Update Pesanan - ${orderCode}`;
}

/**
 * Generate email HTML body based on status
 */
function getEmailBody(order, status) {
  const customerName = order.shipping_address?.name || 'Pelanggan';
  const statusMessages = {
    paid: 'Pembayaran Anda telah kami terima. Pesanan Anda akan segera diproses.',
    processing: 'Pesanan Anda sedang diproses oleh tim kami.',
    shipped: 'Pesanan Anda telah dikirim dan sedang dalam perjalanan.',
    delivered: 'Pesanan Anda telah sampai di tujuan. Terima kasih atas kepercayaan Anda!',
    cancelled: 'Pesanan Anda telah dibatalkan. Jika ada pertanyaan, silakan hubungi kami.',
  };

  const message = statusMessages[status] || 'Status pesanan Anda telah diperbarui.';

  // Generate items summary
  let itemsHtml = '';
  if (order.items && order.items.length > 0) {
    itemsHtml = order.items.map(item => {
      const variantText = item.variant_name ? ` (${item.variant_name})` : '';
      return `
        <tr>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb;">${item.product_name}${variantText}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: center;">${item.quantity}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatRupiah(item.price)}</td>
          <td style="padding: 8px; border-bottom: 1px solid #e5e7eb; text-align: right;">${formatRupiah(item.price * item.quantity)}</td>
        </tr>
      `;
    }).join('');
  }

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${getEmailSubject(status, order.order_code)}</title>
    </head>
    <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
      <div style="background-color: #78716c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
        <h1 style="margin: 0; font-size: 24px;">ILENA INTERIOR</h1>
      </div>
      
      <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
        <h2 style="color: #78716c; margin-top: 0;">Halo, ${customerName}!</h2>
        
        <p style="font-size: 16px; margin: 20px 0;">${message}</p>
        
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #78716c; margin-top: 0;">Detail Pesanan</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Kode Pesanan:</td>
              <td style="padding: 8px 0;">${order.order_code}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Status:</td>
              <td style="padding: 8px 0; text-transform: capitalize;">${status}</td>
            </tr>
            <tr>
              <td style="padding: 8px 0; font-weight: bold;">Total:</td>
              <td style="padding: 8px 0; font-size: 18px; font-weight: bold; color: #78716c;">${formatRupiah(order.total)}</td>
            </tr>
          </table>
        </div>
        
        ${itemsHtml ? `
        <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0;">
          <h3 style="color: #78716c; margin-top: 0;">Item Pesanan</h3>
          <table style="width: 100%; border-collapse: collapse;">
            <thead>
              <tr style="background-color: #f3f4f6;">
                <th style="padding: 8px; text-align: left; border-bottom: 2px solid #e5e7eb;">Produk</th>
                <th style="padding: 8px; text-align: center; border-bottom: 2px solid #e5e7eb;">Qty</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Harga</th>
                <th style="padding: 8px; text-align: right; border-bottom: 2px solid #e5e7eb;">Subtotal</th>
              </tr>
            </thead>
            <tbody>
              ${itemsHtml}
            </tbody>
          </table>
          
          <div style="margin-top: 20px; padding-top: 20px; border-top: 2px solid #e5e7eb;">
            <table style="width: 100%;">
              <tr>
                <td style="padding: 4px 0; text-align: right;">Subtotal:</td>
                <td style="padding: 4px 0; text-align: right; width: 150px;">${formatRupiah(order.subtotal)}</td>
              </tr>
              <tr>
                <td style="padding: 4px 0; text-align: right;">Ongkir:</td>
                <td style="padding: 4px 0; text-align: right;">${formatRupiah(order.shipping_cost || 0)}</td>
              </tr>
              ${order.discount > 0 ? `
              <tr>
                <td style="padding: 4px 0; text-align: right;">Diskon:</td>
                <td style="padding: 4px 0; text-align: right;">-${formatRupiah(order.discount)}</td>
              </tr>
              ` : ''}
              <tr style="font-weight: bold; font-size: 18px; color: #78716c;">
                <td style="padding: 8px 0; text-align: right; border-top: 2px solid #e5e7eb;">Total:</td>
                <td style="padding: 8px 0; text-align: right; border-top: 2px solid #e5e7eb;">${formatRupiah(order.total)}</td>
              </tr>
            </table>
          </div>
        </div>
        ` : ''}
        
        <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
          Jika Anda memiliki pertanyaan, silakan hubungi kami melalui email atau WhatsApp.
        </p>
        
        <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
          Terima kasih telah berbelanja di ILENA INTERIOR!
        </p>
      </div>
      
      <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #9ca3af;">
        <p>© ${new Date().getFullYear()} ILENA INTERIOR. All rights reserved.</p>
      </div>
    </body>
    </html>
  `;
}

/**
 * Send order status update email to customer
 * @param {Object} order - Order object with all details
 * @param {string} newStatus - New order status
 * @returns {Promise<void>}
 */
async function sendOrderStatusEmail(order, newStatus) {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('[Email] SMTP not configured, skipping email notification');
      return;
    }

    // Get customer email from shipping_address
    const customerEmail = order.shipping_address?.email;
    if (!customerEmail) {
      console.log('[Email] No customer email found in shipping_address');
      return;
    }

    const mailOptions = {
      from: `"ILENA INTERIOR" <${process.env.SMTP_USER}>`,
      to: customerEmail,
      subject: getEmailSubject(newStatus, order.order_code),
      html: getEmailBody(order, newStatus),
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[Email] Sent to ${customerEmail}: ${info.messageId}`);
  } catch (error) {
    // Log error but don't throw - email failure shouldn't block status update
    console.error('[Email] Failed to send notification:', error.message);
  }
}

/**
 * Send password reset email to user
 * @param {string} email - User email address
 * @param {string} name - User name
 * @param {string} temporaryPassword - Temporary password
 * @returns {Promise<void>}
 */
async function sendPasswordResetEmail(email, name, temporaryPassword) {
  try {
    // Check if SMTP is configured
    if (!process.env.SMTP_USER || !process.env.SMTP_PASS) {
      console.log('[Email] SMTP not configured, skipping password reset email');
      return;
    }

    const mailOptions = {
      from: `"ILENA INTERIOR" <${process.env.SMTP_USER}>`,
      to: email,
      subject: 'Password Reset - ILENA INTERIOR',
      html: `
        <!DOCTYPE html>
        <html>
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1.0">
          <title>Password Reset - ILENA INTERIOR</title>
        </head>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
          <div style="background-color: #78716c; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
            <h1 style="margin: 0; font-size: 24px;">ILENA INTERIOR</h1>
          </div>
          
          <div style="background-color: #f9fafb; padding: 30px; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px;">
            <h2 style="color: #78716c; margin-top: 0;">Halo, ${name}!</h2>
            
            <p style="font-size: 16px; margin: 20px 0;">
              Password akun Anda telah direset oleh administrator. Berikut adalah password sementara Anda:
            </p>
            
            <div style="background-color: white; padding: 20px; border-radius: 8px; margin: 20px 0; border: 2px solid #78716c;">
              <p style="margin: 0 0 10px 0; font-weight: bold; color: #78716c;">Password Sementara:</p>
              <p style="margin: 0; font-size: 20px; font-family: 'Courier New', monospace; font-weight: bold; color: #1f2937; word-break: break-all;">
                ${temporaryPassword}
              </p>
            </div>
            
            <div style="background-color: #fef3c7; padding: 15px; border-radius: 8px; margin: 20px 0; border-left: 4px solid #f59e0b;">
              <p style="margin: 0; font-size: 14px; color: #92400e;">
                <strong>⚠️ Penting:</strong> Segera ubah password Anda setelah login untuk keamanan akun Anda.
              </p>
            </div>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Untuk mengubah password:
            </p>
            <ol style="font-size: 14px; color: #6b7280; margin: 10px 0; padding-left: 20px;">
              <li>Login menggunakan password sementara di atas</li>
              <li>Buka halaman profil Anda</li>
              <li>Pilih "Ubah Password"</li>
              <li>Masukkan password baru yang kuat</li>
            </ol>
            
            <p style="margin-top: 30px; font-size: 14px; color: #6b7280;">
              Jika Anda tidak meminta reset password, segera hubungi kami.
            </p>
            
            <p style="margin-top: 20px; font-size: 14px; color: #6b7280;">
              Terima kasih,<br>
              Tim ILENA INTERIOR
            </p>
          </div>
          
          <div style="text-align: center; margin-top: 20px; padding: 20px; font-size: 12px; color: #9ca3af;">
            <p>© ${new Date().getFullYear()} ILENA INTERIOR. All rights reserved.</p>
          </div>
        </body>
        </html>
      `,
    };

    const info = await getTransporter().sendMail(mailOptions);
    console.log(`[Email] Password reset email sent to ${email}: ${info.messageId}`);
  } catch (error) {
    // Email failure shouldn't block password reset. Keep log quiet for invalid local SMTP credentials.
  }
}

module.exports = { sendOrderStatusEmail, sendPasswordResetEmail };
