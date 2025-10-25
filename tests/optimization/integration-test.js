/**
 * Integration Tests for Cal.com Dev Server Optimizations
 * 
 * Ensures all optimizations work together without breaking functionality
 */

const { execSync } = require('child_process');
const fs = require('fs');
const path = require('path');
const assert = require('assert');

class IntegrationTester {
  constructor() {
    this.testResults = [];
  }

  /**
   * Test AssetSymlinkManager functionality
   */
  testAssetSymlinks() {
    console.log('\n🔗 Testing Asset Symlink Manager...');
    
    try {
      // Run the symlink manager
      execSync('node utils/AssetSymlinkManager.js', {
        cwd: path.join(__dirname, '../../')
      });

      // Verify symlinks were created
      const publicDir = path.join(__dirname, '../../public');
      const appStaticDir = path.join(publicDir, 'app-static');
      
      assert(fs.existsSync(appStaticDir), 'app-static symlink should exist');
      assert(fs.lstatSync(appStaticDir).isSymbolicLink(), 'app-static should be a symlink');

      // Test cleanup
      execSync('node utils/AssetSymlinkManager.js --cleanup', {
        cwd: path.join(__dirname, '../../')
      });
      
      assert(!fs.existsSync(appStaticDir), 'Symlinks should be cleaned up');

      this.testResults.push({ test: 'AssetSymlinks', status: 'PASS' });
      console.log('✅ Asset symlinks working correctly');
    } catch (error) {
      this.testResults.push({ test: 'AssetSymlinks', status: 'FAIL', error: error.message });
      console.error('❌ Asset symlinks test failed:', error.message);
    }
  }

  /**
   * Test Route Manifest generation
   */
  testRouteManifest() {
    console.log('\n📋 Testing Route Manifest...');
    
    try {
      const RouteManifest = require('../../utils/RouteManifest');
      const manifest = new RouteManifest();
      
      // Test scanning
      const routes = manifest.scanRoutes();
      assert(routes.length > 0, 'Should find routes');
      assert(routes.some(r => r.priority === 'critical'), 'Should identify critical routes');

      // Test manifest generation
      const manifestData = manifest.buildManifest(routes);
      assert(manifestData.routes, 'Manifest should have routes');
      assert(manifestData.dependencies, 'Manifest should have dependencies');
      
      // Test saving
      manifest.saveManifest(manifestData);
      const manifestPath = path.join(__dirname, '../../.next/route-manifest.json');
      assert(fs.existsSync(manifestPath), 'Manifest file should be created');

      this.testResults.push({ test: 'RouteManifest', status: 'PASS' });
      console.log('✅ Route manifest working correctly');
    } catch (error) {
      this.testResults.push({ test: 'RouteManifest', status: 'FAIL', error: error.message });
      console.error('❌ Route manifest test failed:', error.message);
    }
  }

  /**
   * Test Route Lazy Loader
   */
  testRouteLazyLoader() {
    console.log('\n🎯 Testing Route Lazy Loader...');
    
    try {
      const RouteLazyLoader = require('../../utils/RouteLazyLoader');
      const loader = new RouteLazyLoader();
      
      // Test priority sorting
      const routes = [
        { path: '/api/test', priority: 'low' },
        { path: '/auth/login', priority: 'critical' },
        { path: '/settings', priority: 'high' }
      ];
      
      const sorted = loader.sortByPriority(routes);
      assert(sorted[0].priority === 'critical', 'Critical routes should be first');
      assert(sorted[sorted.length - 1].priority === 'low', 'Low priority routes should be last');

      // Test chunk generation
      const chunks = loader.generateChunks(routes);
      assert(chunks.critical.length > 0, 'Should have critical chunks');

      this.testResults.push({ test: 'RouteLazyLoader', status: 'PASS' });
      console.log('✅ Route lazy loader working correctly');
    } catch (error) {
      this.testResults.push({ test: 'RouteLazyLoader', status: 'FAIL', error: error.message });
      console.error('❌ Route lazy loader test failed:', error.message);
    }
  }

  /**
   * Test App Registry Optimizer
   */
  testAppRegistryOptimizer() {
    console.log('\n📦 Testing App Registry Optimizer...');
    
    try {
      const AppRegistryOptimizer = require('../../utils/AppRegistryOptimizer');
      const optimizer = new AppRegistryOptimizer();
      
      // Test cache directory creation
      assert(fs.existsSync(optimizer.cacheDir), 'Cache directory should exist');

      // Test metadata extraction (mock)
      const mockMetadata = {
        slug: 'test-app',
        name: 'Test App',
        version: '1.0.0'
      };
      
      const cacheKey = optimizer.getCacheKey(mockMetadata);
      assert(typeof cacheKey === 'string', 'Should generate cache key');
      assert(cacheKey.includes('test-app'), 'Cache key should include app slug');

      this.testResults.push({ test: 'AppRegistryOptimizer', status: 'PASS' });
      console.log('✅ App registry optimizer working correctly');
    } catch (error) {
      this.testResults.push({ test: 'AppRegistryOptimizer', status: 'FAIL', error: error.message });
      console.error('❌ App registry optimizer test failed:', error.message);
    }
  }

  /**
   * Test Next.js config integration
   */
  testNextConfig() {
    console.log('\n⚙️ Testing Next.js Configuration...');
    
    try {
      const configPath = path.join(__dirname, '../../next.config.js');
      assert(fs.existsSync(configPath), 'next.config.js should exist');
      
      // Verify the config can be loaded
      delete require.cache[configPath];
      const config = require(configPath);
      
      assert(config.webpack, 'Config should have webpack function');
      assert(config.experimental, 'Config should have experimental features');

      this.testResults.push({ test: 'NextConfig', status: 'PASS' });
      console.log('✅ Next.js configuration valid');
    } catch (error) {
      this.testResults.push({ test: 'NextConfig', status: 'FAIL', error: error.message });
      console.error('❌ Next.js config test failed:', error.message);
    }
  }

  /**
   * Run existing test suite to ensure no regressions
   */
  async testExistingSuite() {
    console.log('\n🧪 Running existing test suite...');
    
    try {
      // Run unit tests
      console.log('Running unit tests...');
      execSync('npm run test:unit -- --passWithNoTests', {
        cwd: path.join(__dirname, '../../'),
        stdio: 'pipe'
      });

      this.testResults.push({ test: 'ExistingTests', status: 'PASS' });
      console.log('✅ Existing tests pass');
    } catch (error) {
      this.testResults.push({ test: 'ExistingTests', status: 'FAIL', error: 'Some tests failed' });
      console.error('❌ Some existing tests failed');
    }
  }

  /**
   * Run all integration tests
   */
  async runAllTests() {
    console.log('🧪 Cal.com Optimization Integration Tests\n');
    console.log('=' .repeat(50));

    // Run individual component tests
    this.testAssetSymlinks();
    this.testRouteManifest();
    this.testRouteLazyLoader();
    this.testAppRegistryOptimizer();
    this.testNextConfig();
    
    // Run existing tests
    await this.testExistingSuite();

    // Generate report
    this.generateReport();
  }

  /**
   * Generate test report
   */
  generateReport() {
    console.log('\n📊 TEST REPORT');
    console.log('=' .repeat(50));
    
    const passed = this.testResults.filter(r => r.status === 'PASS').length;
    const failed = this.testResults.filter(r => r.status === 'FAIL').length;
    
    console.log(`\nTotal Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    
    console.log('\nDetailed Results:');
    this.testResults.forEach(result => {
      console.log(`  ${result.status === 'PASS' ? '✅' : '❌'} ${result.test}`);
      if (result.error) {
        console.log(`     Error: ${result.error}`);
      }
    });

    // Save report
    const report = {
      timestamp: new Date().toISOString(),
      summary: { total: this.testResults.length, passed, failed },
      results: this.testResults
    };

    fs.writeFileSync(
      path.join(__dirname, 'integration-report.json'),
      JSON.stringify(report, null, 2)
    );

    console.log('\n💾 Full report saved to: tests/optimization/integration-report.json');

    // Exit with appropriate code
    process.exit(failed > 0 ? 1 : 0);
  }
}

// Run the tests
if (require.main === module) {
  const tester = new IntegrationTester();
  tester.runAllTests().catch(console.error);
}

module.exports = IntegrationTester;