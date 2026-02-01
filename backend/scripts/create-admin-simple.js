const http = require('http');

const adminData = {
  email: process.env.ADMIN_EMAIL || 'admin@university.edu',
  password: process.env.ADMIN_PASSWORD || 'admin123'
};

const postData = JSON.stringify(adminData);

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/auth/register',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': Buffer.byteLength(postData)
  }
};

const req = http.request(options, (res) => {
  let data = '';

  res.on('data', (chunk) => {
    data += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(data);
      if (response.success) {
        console.log('Admin created successfully!');
        console.log('Email:', response.data.admin.email);
        console.log('ID:', response.data.admin.id);
        console.log('\n  Default credentials:');
        console.log('   Email:', adminData.email);
        console.log('   Password:', adminData.password);
        console.log('\n Please change the default password after first login!');
      } else {
        console.log('Error:', response.message);
        if (response.message.includes('already exists')) {
          console.log(' Admin already exists. You can login with the credentials above.');
        }
      }
    } catch (error) {
      console.error('Error parsing response:', error);
      console.log('Response:', data);
    }
  });
});

req.on('error', (error) => {
  console.error(' Error creating admin:', error.message);
  console.error('   Make sure the server is running: npm run dev');
  process.exit(1);
});

req.write(postData);
req.end();

