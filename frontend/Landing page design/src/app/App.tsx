import { motion } from "motion/react";
import { Shield, Users, Wrench, ArrowRight, Check } from "lucide-react";
import { ImageWithFallback } from "./components/figma/ImageWithFallback";
import dashboardImg from "../imports/image.png";

export default function App() {
  return (
    <div className="size-full bg-white">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 bg-white/80 backdrop-blur-sm border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <span className="text-white font-bold text-lg">D</span>
            </div>
            <span className="font-semibold text-xl">Document Labs</span>
          </div>
          <div className="flex items-center gap-8">
            <a href="#features" className="text-gray-600 hover:text-gray-900 transition-colors">Features</a>
            <a href="#product" className="text-gray-600 hover:text-gray-900 transition-colors">Product</a>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Get Started
            </motion.button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <ImageWithFallback
            src="https://images.unsplash.com/photo-1758876020343-c8c2add9d527?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=1920"
            alt="Professional workspace"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-black/70 via-black/50 to-transparent" />
        </div>

        <div className="relative z-10 max-w-7xl mx-auto px-6 pt-16">
          <div className="max-w-2xl">
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.2 }}
            >
              <h1 className="text-7xl font-bold text-white mb-6 leading-tight">
                Secure, reliable document management
              </h1>
            </motion.div>

            <motion.p
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.4 }}
              className="text-xl text-gray-200 mb-12 max-w-xl"
            >
              Manage all your documents in one place with powerful editing tools, enterprise-grade security, and seamless collaboration.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.6 }}
              className="flex items-center gap-4"
            >
              <motion.button
                whileHover={{ scale: 1.05, x: 5 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold flex items-center gap-2 hover:bg-blue-700 transition-colors group"
              >
                Start Free Trial
                <ArrowRight className="size-5 group-hover:translate-x-1 transition-transform" />
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-colors"
              >
                Watch Demo
              </motion.button>
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.8, delay: 0.8 }}
              className="flex items-center gap-6 mt-12 text-white/80"
            >
              <div className="flex items-center gap-2">
                <Check className="size-5" />
                <span>No credit card required</span>
              </div>
              <div className="flex items-center gap-2">
                <Check className="size-5" />
                <span>14-day free trial</span>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 bg-gray-50">
        <div className="max-w-7xl mx-auto px-6">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-16">
            {/* Security */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6 }}
              className="space-y-6"
            >
              <div className="relative h-80 rounded-2xl overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1775163035702-06e47ba88857?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                  alt="Secure document scanning"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <div className="size-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Shield className="size-6 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Enterprise-grade security</h3>
                <p className="text-gray-600 leading-relaxed">
                  Bank-level encryption, role-based access control, and complete audit trails keep your documents protected at all times.
                </p>
              </div>
            </motion.div>

            {/* Collaboration */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.2 }}
              className="space-y-6"
            >
              <div className="relative h-80 rounded-2xl overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1759752394757-323a0adc0d62?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                  alt="Team collaboration"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <div className="size-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Users className="size-6 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Seamless collaboration</h3>
                <p className="text-gray-600 leading-relaxed">
                  Share, review, and co-edit documents in real-time with your team, complete with version control and commenting.
                </p>
              </div>
            </motion.div>

            {/* Document Lab */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-100px" }}
              transition={{ duration: 0.6, delay: 0.4 }}
              className="space-y-6"
            >
              <div className="relative h-80 rounded-2xl overflow-hidden">
                <ImageWithFallback
                  src="https://images.unsplash.com/photo-1758873272808-5580ed7deb44?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=800"
                  alt="Document editing workspace"
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                <div className="absolute bottom-6 left-6">
                  <div className="size-12 bg-blue-600 rounded-xl flex items-center justify-center mb-4">
                    <Wrench className="size-6 text-white" />
                  </div>
                </div>
              </div>
              <div>
                <h3 className="text-2xl font-bold mb-3">Powerful Document Lab</h3>
                <p className="text-gray-600 leading-relaxed">
                  Edit, annotate, and transform documents with professional tools—from PDFs to complex contracts and reports.
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Product Preview */}
      <section id="product" className="py-32 bg-white">
        <div className="max-w-7xl mx-auto px-6">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6 }}
            className="text-center mb-16"
          >
            <h2 className="text-5xl font-bold mb-6">Everything you need in one place</h2>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Track, organize, and manage all your documents with an intuitive dashboard built for productivity.
            </p>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="relative"
          >
            <div className="rounded-2xl overflow-hidden shadow-2xl border border-gray-200">
              <img
                src={dashboardImg}
                alt="Document Labs Dashboard"
                className="w-full"
              />
            </div>
            <div className="absolute -bottom-6 -right-6 -left-6 h-32 bg-gradient-to-t from-white via-white/50 to-transparent blur-xl -z-10" />
          </motion.div>

          <motion.div
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            viewport={{ once: true, margin: "-100px" }}
            transition={{ duration: 0.6, delay: 0.4 }}
            className="grid grid-cols-2 lg:grid-cols-4 gap-8 mt-20 text-center"
          >
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">99.9%</div>
              <div className="text-gray-600">Uptime guarantee</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">50TB</div>
              <div className="text-gray-600">Storage capacity</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">10M+</div>
              <div className="text-gray-600">Documents processed</div>
            </div>
            <div>
              <div className="text-4xl font-bold text-blue-600 mb-2">24/7</div>
              <div className="text-gray-600">Support available</div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Final CTA */}
      <section className="py-32 bg-gray-900 text-white">
        <div className="max-w-4xl mx-auto px-6 text-center">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <h2 className="text-5xl font-bold mb-6">Ready to transform your document workflow?</h2>
            <p className="text-xl text-gray-300 mb-12">
              Join thousands of teams managing their documents with confidence.
            </p>
            <div className="flex items-center justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-blue-600 text-white rounded-lg font-semibold hover:bg-blue-700 transition-colors"
              >
                Start Your Free Trial
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="px-8 py-4 bg-white/10 backdrop-blur-sm text-white rounded-lg font-semibold border border-white/20 hover:bg-white/20 transition-colors"
              >
                Contact Sales
              </motion.button>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-black text-gray-400 py-12">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="size-8 bg-blue-600 rounded-lg flex items-center justify-center">
                <span className="text-white font-bold">D</span>
              </div>
              <span className="font-semibold text-white">Document Labs</span>
            </div>
            <div className="text-sm">
              © 2026 Document Labs. All rights reserved.
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}