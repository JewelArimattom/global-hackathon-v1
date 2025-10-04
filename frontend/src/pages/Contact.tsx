import React, { useState } from 'react';

// A reusable component for the FAQ accordion
const FaqAccordion = ({ title, children }: { title: string, children: React.ReactNode }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex justify-between items-center text-left text-lg font-medium text-gray-800 focus:outline-none"
      >
        <span>{title}</span>
        <svg
          className={`w-6 h-6 transform transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>
      {isOpen && (
        <div className="mt-4 text-gray-600">
          {children}
        </div>
      )}
    </div>
  );
};

const Contact = () => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    reason: 'customer-question',
    message: '',
  });

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setFormData({
      ...formData,
      [e.target.name]: e.target.value,
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // In a real application, you would send this data to your backend API
    console.log('Form submitted:', formData);
    alert('Thank you for your message! We will get back to you shortly.');
    // Reset form
    setFormData({ name: '', email: '', reason: 'customer-question', message: '' });
  };

  return (
    <div className="bg-white">
      {/* Header Section */}
      <div className="text-center py-16 bg-lime-50">
        <h1 className="text-4xl font-extrabold text-gray-900 sm:text-5xl">Get in Touch</h1>
        <p className="mt-4 text-xl text-gray-600">We'd love to hear from you. Whether you have a question, feedback, or a partnership inquiry, we're here to help.</p>
      </div>

      <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
          
          {/* Contact Form Section */}
          <div className="bg-gray-50 p-8 rounded-lg shadow-md">
            <h2 className="text-2xl font-bold text-gray-900 mb-6">Send Us a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">Full Name</label>
                <input type="text" name="name" id="name" required value={formData.name} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">Email Address</label>
                <input type="email" name="email" id="email" required value={formData.email} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"/>
              </div>
              <div>
                <label htmlFor="reason" className="block text-sm font-medium text-gray-700">Reason for Contact</label>
                <select name="reason" id="reason" value={formData.reason} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 bg-white rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500">
                  <option value="customer-question">Customer Question</option>
                  <option value="farmer-inquiry">I'm a Farmer and want to join</option>
                  <option value="partnership">Partnership Inquiry</option>
                  <option value="feedback">Website Feedback</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <div>
                <label htmlFor="message" className="block text-sm font-medium text-gray-700">Message</label>
                <textarea name="message" id="message" rows={5} required value={formData.message} onChange={handleChange} className="mt-1 block w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-green-500 focus:border-green-500"></textarea>
              </div>
              <div>
                <button type="submit" className="w-full flex justify-center py-3 px-4 border border-transparent rounded-md shadow-sm text-base font-medium text-white bg-green-600 hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500">
                  Submit Message
                </button>
              </div>
            </form>
          </div>

          {/* Info & FAQ Section */}
          <div className="space-y-10">
            {/* Contact Details */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Contact Information</h2>
              <div className="space-y-4 text-gray-600">
                {/* --- UPDATED LOCATION --- */}
                <p className="flex items-center"><svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/></svg>Pala, Kottayam, Kerala, India</p>
                <p className="flex items-center"><svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"/></svg>support@farmconnect.com</p>
                <p className="flex items-center"><svg className="w-6 h-6 mr-3 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>+91 123-456-7890</p>
              </div>
            </div>

            {/* FAQ Section */}
            <div>
              <h2 className="text-2xl font-bold text-gray-900 mb-4">Frequently Asked Questions</h2>
              <div className="space-y-2">
                <FaqAccordion title="How is the produce delivered?">
                  <p>We partner with local delivery services to bring your order straight from the farm to your doorstep, typically within 24-48 hours of harvest to ensure maximum freshness.</p>
                </FaqAccordion>
                <FaqAccordion title="How can I become a partner farmer?">
                  <p>We're always looking for passionate local farmers to join our platform! Please select "I'm a Farmer" in the contact form above and tell us a bit about your farm. Our partnership team will get in touch with you.</p>
                </FaqAccordion>
                <FaqAccordion title="What makes your products different?">
                  <p>Our products come directly from local farmers, eliminating long supply chains. This means you get fresher, healthier food while supporting your local economy and sustainable farming practices.</p>
                </FaqAccordion>
              </div>
            </div>
          </div>
        </div>
      </div>

       {/* Map Section */}
       <div className="max-w-7xl mx-auto py-16 px-4 sm:px-6 lg:px-8">
        <div className="rounded-lg shadow-xl overflow-hidden">
        {/* --- UPDATED MAP --- */}
        <iframe
            src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d31481.39382216584!2d76.66981884735237!3d9.70993073068989!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x3b07cd8095b52321%3A0x336a55e69f37c356!2sPala%2C%20Kerala%2C%20India!5e0!3m2!1sen!2sus"
            width="100%"
            height="450"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
          ></iframe>
        </div>
      </div>
    </div>
  );
};

export default Contact;