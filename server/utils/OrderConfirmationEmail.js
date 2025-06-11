import React from 'react';

const OrderConfirmationEmail = ({
  customerName,
  orderId,
  orderItems,
  totalAmount,
  shippingAddress,
  orderDate,
  orderTrackingUrl
}) => {
  const dateOptions = {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit'
  };
  const formattedDate = new Date(orderDate).toLocaleDateString('en-US', dateOptions);

  // Define common styles
  const containerStyle = {
    fontFamily: 'Arial, sans-serif',
    lineHeight: '1.6',
    color: '#333',
    maxWidth: '600px',
    margin: '20px auto',
    padding: '20px',
    border: '1px solid #e0e0e0',
    borderRadius: '8px',
    backgroundColor: '#ffffff'
  };

  const headerStyle = {
    color: '#007bff',
    textAlign: 'center',
    marginBottom: '20px',
    fontSize: '28px'
  };

  const sectionHeadingStyle = {
    color: '#333',
    fontSize: '20px',
    marginTop: '30px',
    marginBottom: '15px',
    borderBottom: '1px solid #e0e0e0',
    paddingBottom: '5px'
  };

  const paragraphStyle = {
    marginBottom: '10px'
  };

  const buttonStyle = {
    display: 'inline-block',
    marginTop: '20px',
    padding: '12px 25px',
    backgroundColor: '#007bff',
    color: '#ffffff',
    textDecoration: 'none',
    borderRadius: '5px',
    fontWeight: 'bold',
    textAlign: 'center'
  };

  const tableStyle = {
    width: '100%',
    borderCollapse: 'collapse',
    marginTop: '15px',
    marginBottom: '20px'
  };

  const thStyle = {
    textAlign: 'left',
    padding: '10px',
    borderBottom: '1px solid #e0e0e0',
    backgroundColor: '#f8f8f8'
  };

  const tdStyle = {
    padding: '10px',
    borderBottom: '1px solid #e0e0e0'
  };

  const footerStyle = {
    marginTop: '40px',
    fontSize: '0.9em',
    color: '#666',
    textAlign: 'center'
  };

  return React.createElement(
    'div',
    { style: { backgroundColor: '#f4f4f4', padding: '20px 0' } }, // Outer wrapper for background
    React.createElement(
      'div',
      { style: containerStyle },

      React.createElement('h2', { style: headerStyle }, 'Order Confirmation - Grocerycart'),

      React.createElement('p', { style: paragraphStyle }, `Hello ${customerName},`),
      React.createElement('p', { style: paragraphStyle }, `Your order `),
      React.createElement('strong', null, `#${orderId}`),
      React.createElement('p', { style: paragraphStyle }, ` placed on ${formattedDate} has been successfully confirmed.`),

      React.createElement('h3', { style: sectionHeadingStyle }, 'Order Items'),
      React.createElement(
        'table',
        { style: tableStyle },
        React.createElement(
          'thead',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('th', { style: thStyle }, 'Item'),
            React.createElement('th', { style: thStyle, width: '100px', textAlign: 'center' }, 'Qty'),
            React.createElement('th', { style: thStyle, width: '100px', textAlign: 'right' }, 'Price')
          )
        ),
        React.createElement(
          'tbody',
          null,
          orderItems.map((item, index) =>
            React.createElement(
              'tr',
              { key: index },
              React.createElement('td', { style: tdStyle }, item.name),
              React.createElement('td', { style: { ...tdStyle, textAlign: 'center' } }, item.quantity),
              React.createElement('td', { style: { ...tdStyle, textAlign: 'right' } }, `₹${item.price}`)
            )
          )
        ),
        React.createElement(
          'tfoot',
          null,
          React.createElement(
            'tr',
            null,
            React.createElement('td', { style: { ...tdStyle, borderBottom: 'none', paddingTop: '20px' }, colSpan: '2' }, React.createElement('strong', null, 'Total Amount:')),
            React.createElement('td', { style: { ...tdStyle, borderBottom: 'none', paddingTop: '20px', textAlign: 'right' } }, React.createElement('strong', null, `₹${totalAmount}`))
          )
        )
      ),

      React.createElement('h3', { style: sectionHeadingStyle }, 'Shipping Address'),
      React.createElement('p', { style: paragraphStyle }, shippingAddress),

      orderTrackingUrl &&
        React.createElement(
          'p',
          { style: { textAlign: 'center' } }, // Center the button
          React.createElement(
            'a',
            {
              href: orderTrackingUrl,
              style: buttonStyle
            },
            'Track Your Order'
          )
        ),

      React.createElement('p', { style: { ...paragraphStyle, textAlign: 'center', marginTop: '30px' } }, 'Thank you for shopping with Grocerycart!'),
      React.createElement('p', { style: footerStyle }, 'The Grocerycart Team')
    )
  );
};

export default OrderConfirmationEmail;