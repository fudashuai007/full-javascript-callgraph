

// function a(a){
//   // console.log(a);
// }

// function a(){
//   // console.log(1);
// }

// a(2)
// case 0
const aa = function(){}
// case1
// function a() {
// }

// const { assertAccessor } = require("@babel/types");

// case2
// function a() {
//   return () => { }
// }

// case3
// let p = {
//   c:assertAccessor,
//   obj: function () { },
//   11: function () { },
//   'a': function () { },
//   d: function cc(){}
// }

// case4
// (function(){})(function(){})
// !function () {
//   console.log(2123);
// }();
// ~(function(){ 
//   alert('water'); 
// })(function(){});//写法有点酷~ 
// void function(){ 
//   alert('water'); 
// }(function(){});//据说效率最高~ 
// (function f() {
//   //代码块
// })(function(){})
// assdasdasds(function(){})
// // case5
// aa.add(function(){})
//  az(cc(function(){}))
// // // case 6
// aa(function(){})(bb(function(){}))
// a.aa(function(){}).bb()
// aa().bb(cc(function(){}))
// aa(function(){}).bb(cc(function(){}))
// za.aa(function (){})
// function main () {
// 	const b = {'a': () => { return 1; } };
// 	const {a: foo} = b;
// 	foo();
// }
// [function(){},function a(){}]
// // case 7
// let obj ={
//   b:function a(){}
// }


// @testable(function(){})
// class MyTestableClass {
//   // ...
// }

// case 8
// @frozen class Foo {
//   // @configurable(false)
//   // @enumerable(true)
//   // method() {}

//   // @throttle(500)
//   expensiveMethod() {}
// }
// @test()
// class P {}

// function test(){}


// case 9
// let aa = function b(cc){
//   cc(function(){})
//   // console.log(1);
// }

// aa(function (){})

// console.log(aa);

//case 10
// function main () {
// 	function cc(){}
// 	const a = [ (e) => { e() } ];
// 	let [b] = a;
// 	b(cc);
// }

// main();

// case 11
// const fun1 = require('./fun1')
// const fun2 = require('./fun2')
// fun1.aa()
// square(11); // 121
// diag(4, 3); // 5

// const {a,b} = require('lib')
// a()
// b()

// @test()
// class C {}