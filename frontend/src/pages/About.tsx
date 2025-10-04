import { Link } from 'react-router-dom';

// Icons as React Components for better reusability
const QualityIcon = () => (
  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" /></svg>
);

const CommunityIcon = () => (
  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg>
);

const SustainabilityIcon = () => (
  <svg className="w-12 h-12 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
);

const About = () => {
  return (
    <div className="bg-white">
      {/* Hero Section */}
      <div className="relative bg-gray-800">
        <div className="absolute inset-0">
          {/* Replace with a high-quality image of a farm or fresh produce */}
          <img
            className="w-full h-full object-cover"
            src="https://images.unsplash.com/photo-1560493676-04071c5f467b?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1974&q=80"
            alt="Fresh vegetables on a farm"
          />
          <div className="absolute inset-0 bg-gray-700 mix-blend-multiply" aria-hidden="true" />
        </div>
        <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8 text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">About FarmConnect</h1>
          <p className="mt-6 text-xl text-indigo-100 max-w-3xl mx-auto">
            Connecting communities with the freshest produce, straight from the fields of local farmers.
          </p>
        </div>
      </div>

      {/* Our Mission Section */}
      <div className="bg-white py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 md:grid-cols-2 gap-12 items-center">
          <div>
            <h2 className="text-3xl font-extrabold text-gray-900 tracking-tight">Our Mission: Freshness and Fairness</h2>
            <p className="mt-4 text-lg text-gray-500">
              FarmConnect was born from a simple idea: the food you eat should be fresh, healthy, and sourced from farmers who are treated fairly. We saw a disconnect between the hard-working individuals who cultivate our food and the communities who consume it.
            </p>
            <p className="mt-4 text-lg text-gray-500">
              Our platform bridges that gap. We empower local farmers by giving them a direct channel to sell their produce, and we provide you with access to food that's tastier, healthier, and supports a sustainable local economy.
            </p>
          </div>
          <div className="rounded-lg overflow-hidden shadow-lg">
            <img 
              src="https://images.unsplash.com/photo-1542838132-92c53300491e?ixlib=rb-4.0.3&ixid=MnwxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8&auto=format&fit=crop&w=1074&q=80"
              alt="Farmer holding a crate of fresh apples"
              className="w-full h-full object-cover"
            />
          </div>
        </div>
      </div>

      {/* Our Values Section */}
      <div className="bg-lime-50 py-16 sm:py-24">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-extrabold text-gray-900">Our Core Values</h2>
            <p className="mt-4 text-lg text-gray-600">The principles that guide everything we do.</p>
          </div>
          <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-10 text-center">
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="flex justify-center mb-4">
                <QualityIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Uncompromising Quality</h3>
              <p className="mt-2 text-gray-500">We partner with farmers who share our passion for quality. Every item on our platform is grown and harvested with care to ensure peak freshness and flavor.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="flex justify-center mb-4">
                <CommunityIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Strengthening Community</h3>
              <p className="mt-2 text-gray-500">We believe in the power of local. By connecting you with farmers in your area, we help build stronger, healthier, and more self-reliant communities.</p>
            </div>
            <div className="p-6 bg-white rounded-lg shadow-md">
              <div className="flex justify-center mb-4">
                <SustainabilityIcon />
              </div>
              <h3 className="text-xl font-semibold text-gray-900">Sustainable Practices</h3>
              <p className="mt-2 text-gray-500">Supporting local agriculture reduces food miles and promotes sustainable farming. We are committed to a healthier planet for future generations.</p>
            </div>
          </div>
        </div>
      </div>

      {/* Call to Action Section */}
      <div className="bg-white">
        <div className="max-w-4xl mx-auto py-16 px-4 sm:px-6 sm:py-24 lg:px-8 text-center">
          <h2 className="text-3xl font-extrabold tracking-tight text-gray-900">Join the Fresh Food Movement</h2>
          <p className="mt-4 text-lg leading-6 text-gray-500">
            Ready to taste the difference? Browse our collection of farm-fresh products and become a part of the FarmConnect community today.
          </p>
          <Link
            to="/products"
            className="mt-8 w-full inline-flex items-center justify-center px-5 py-3 border border-transparent text-base font-medium rounded-md text-white bg-green-600 hover:bg-green-700 sm:w-auto"
          >
            Browse All Products
          </Link>
        </div>
      </div>
    </div>
  );
};

export default About;