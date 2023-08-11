

// function a(a){
//   // console.log(a);
// }

// const { objectExpression } = require("@babel/types")

// const { assertAccessor } = require("@babel/types");


// function a(){
//   // console.log(1);
// }

// a(2)
// case 0
// const aa = function(){
//   function bb(){}
// }
// case1
// function a() {
// }


// case2
// function a() {
//   return () => { }
// }

// case3
// let p = {
//   // c:assertAccessor,
//   // obj: function () { },
//   // 11: function () { },
//   // 'a': function () { },
//   d: {
//     cc:function(){}
//   }
// }
// p.d.cc()
 
// case4
// (function(a){
//   // console.log(2);
//   a()

// })(
  
  
//   function(){}
  
//   )
// !function () {
//   console.log(2123);
// }();
// ~(function(aa){ 
//   aa('water'); 
// })(function(){});//写法有点酷~ 
// void function(){ 
//   alert('water'); 
// }(function(){});//据说效率最高~ 
// (function f(c) {
//   c()
//   //代码块
// })(function(){console.log(123);})

// function a(){
  
// }

// a()


// let a = {
//   toString:function(){}
// }

// a.toString()

// let b = {
//   toString:function(){}
// }

// b.toString()
// let arr = []
// arr.toString()
// function main (b,c) {
// 	// console.log(args[]);
//   // args[0]()
//   // function b(){}
//   b()
//   // c()
// }

// // function b(){}
// main(function(){});
// var obj = {
//   randomMethod1: function () {
//       return 42;
//   },
//   'randomMethod2': function () {
//       return 'red';
//   }
// }

// obj.randomMethod1();
// obj.randomMethod2();


// let obj = {
//   aa:function(){}
// }

// obj.aa()
// assdasdasds(function(){})
// // case5
// aa.add(function(){})
//  az(cc(function(){}))
// // // case 6
// aa(function(){})(bb(function(){}))
// a.aa(function(){}).bb()
// aa().bb(cc(function(){}))
// aa(function(){})
// import a from './a'
// export default function(){}
// a()
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
// function toString(){}
// let p = {
//   a:function(){}
// }
//  function a(ss){
//   //  console.log(1);
//  }
// function a(){
//   // console.log(2);
// }

// a()
// a()
// p.a()
// p.a().b()
// p.f.a().b()
// p.a().f.b()

// class P {

//   toString(){
//     // console.log(123);
//   }
// }
// class A extends P {
//   toString(){
//     // console.log(2);
//   }
//   static method(){
//     super.toString()
//   }
// }
// A.method()
// class SonP extends P {
//   toString(){
//     // console.log(456);
//   }
// }

// let p = new SonP()
// p.toString()



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

// function main () {
// 	let a = function aa(){}
//   a = function(){}
// }

// main();

// let a = function aa(){} && function bb(){}
// let a = 'name'

// let ob= {
//   Array:{type:'native',name:'name'}
// }

// console.log(a in ob);
// (function(){})()
// (function(){
//   //代码块
// })();

// (function f() {
//   //代码块
// })()
// function a(){
//   (function(){
//     console.log(1);
//   })()
// }

// a()
// function a(){
//   let b = ()=>{console.log(1);}
//   b()
// }
// function a(){}
// a()
// let obj = {
//   a:function(){}
// }

// obj.a()
// case 9
// let aa = function b(cc){
//   // console.log(1);
//   function nns(){
//     cc()
//   }
//   nns()
//   // console.log(1);
// }
// // b()
// aa(function (){})
// function cc(as){
//   let cc= {
//     bb:{
    
//       cc:function(){ },
//       dd:function(){}
//     },
//     cc:function(dd){
//       console.log(11);
//     },
//     cc:function aa(gg){
//       console.log(22);
//     }
//   }
//   cc.cc()
// }
// bb(function(){})
// aa.bb(function(){}).cc(function(){})
// cc(function(){}).bb.cc(function(){})
// aa().bb(function(){}).cc(function(){})

// console.log(aa);

//case 10
// let obj = {
//   aa:function(){}
// }
// function main (cc) {
//   obj.aa()

// }
// main(function(){});
// function a(){}
// a()
// function a(){
//   let b = ()=>{
//     console.log(1);
//   }
//   b()
// }

// function bb(){}
// bb()
// (function(cc){ cc()})(
//   function(){
//   // console.log(1);
// })
// 'aaa'.toString()

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

// class A {

//   where(cb) {
//     // this.data = this.data.filter(cb);
//     return this;
//   }

//   groupby(key) {
//     // const map = new Map();
//     // this.data.forEach((d) => {
//     //   if (map.has(d[key])) {
//     //     map.get(d[key]).push(d);
//     //   } else {
//     //     map.set(d[key], [d]);
//     //   }
//     // });

//     // this.data = Array.from(map.values());
//     return this;
//   }

//   excute() {
//     // console.log(this.data);
//   }
// }

// let a = new A()
// a.where(function(){}).groupby().excute()

// let obj1 = {
//   aa:function(){}
// }
// let obj2 = {
//   aa:function(){}
// }

// obj1.aa()

// function aa(q){
//   q()
// }

// function bb(){
//   aa(function(){})
// }
// aa(function(){})
// function cc(){
//   aa(function(){})
// }
// function main(){
//   bb()
//   cc()
// }

// (function(){
//   function a(){
//     let b =arr.map(()=>{})
//   }
// })()
// let arr = [].map(()=>{})
// function disable() {
//   const namespaces = [
//     ...createDebug.names.map(toNamespace),
//     ...createDebug.skips.map(toNamespace).map(namespace => '-' + namespace)
//   ].join(',');
//   createDebug.enable('');
//   return namespaces;
// }
// function a(b){
//   b()
// }

// a(function(){})
// let p = {
//   a:function(){
//     // console.log(1);
//     return this
//   },
//   b:function(){
//     // console.log(2);
//     return this
//   }
// }

// p.a().b()
// function formatArgs(args) {

	args[0].replace(/%[a-zA-Z%]/g,
	() => {

	});

// }
