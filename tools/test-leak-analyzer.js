#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const glob = require('glob');

/**
 * Script to identify potential subscription leaks in test files
 */

function findTestFiles() {
  return glob.sync('src/**/*.spec.ts', { cwd: process.cwd() });
}

function analyzeTestFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8');
  const issues = [];
  
  // Check for subscribe without proper cleanup
  const subscribeMatches = content.match(/\.subscribe\(/g) || [];
  const unsubscribeMatches = content.match(/\.unsubscribe\(/g) || [];
  const subscriptionArrayMatches = content.match(/subscriptions.*push/g) || [];
  
  if (subscribeMatches.length > 0 && unsubscribeMatches.length === 0 && subscriptionArrayMatches.length === 0) {
    issues.push({
      type: 'subscription_leak',
      message: `Found ${subscribeMatches.length} subscribe calls but no unsubscribe cleanup`,
      subscribes: subscribeMatches.length
    });
  }
  
  // Check for timer usage
  const timerMatches = content.match(/(setTimeout|setInterval)\(/g) || [];
  const clearTimerMatches = content.match(/(clearTimeout|clearInterval)\(/g) || [];
  
  if (timerMatches.length > 0 && clearTimerMatches.length === 0) {
    issues.push({
      type: 'timer_leak',
      message: `Found ${timerMatches.length} timer calls but no clear calls`,
      timers: timerMatches.length
    });
  }
  
  // Check for proper afterEach cleanup
  const hasAfterEach = content.includes('afterEach(');
  const hasTestBedReset = content.includes('TestBed.resetTestingModule()');
  
  if (!hasAfterEach) {
    issues.push({
      type: 'missing_cleanup',
      message: 'No afterEach cleanup block found'
    });
  } else if (!hasTestBedReset) {
    issues.push({
      type: 'incomplete_cleanup',
      message: 'afterEach exists but missing TestBed.resetTestingModule()'
    });
  }
  
  return {
    file: filePath,
    issues: issues
  };
}

function generateReport() {
  const testFiles = findTestFiles();
  const results = testFiles.map(analyzeTestFile).filter(result => result.issues.length > 0);
  
  console.log('🔍 Test Leak Analysis Report');
  console.log('============================\n');
  
  if (results.length === 0) {
    console.log('✅ No obvious leaks detected in test files!\n');
    return;
  }
  
  results.forEach(result => {
    console.log(`📄 ${result.file}`);
    result.issues.forEach(issue => {
      console.log(`   ⚠️  ${issue.message}`);
    });
    console.log('');
  });
  
  console.log(`\n📊 Summary: ${results.length} files with potential issues out of ${testFiles.length} total test files\n`);
  
  // Generate recommendations
  console.log('🔧 Recommendations:');
  console.log('1. Add proper afterEach cleanup blocks to all test files');
  console.log('2. Track and unsubscribe from all observables');
  console.log('3. Clear all timers in cleanup');
  console.log('4. Use TestBed.resetTestingModule() in afterEach');
  console.log('5. Consider using the TestCleanup utility for automatic management\n');
}

if (require.main === module) {
  generateReport();
}

module.exports = { analyzeTestFile, generateReport };
